import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { pricingFixture } from "../fixtures/pricing-db";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { createPricingComparison } from "@/server/pricing/comparisons/create";
import {
  getPricingComparison,
  listPricingComparisons,
} from "@/server/pricing/comparisons/read";
setupDatabase();
async function fixture() {
  const f = await pricingFixture();
  return {
    ...f,
    draft: {
      name: "Cenário nomeado",
      request: f.request,
      reference: { kind: "COMMON" as const, unitPrice: "15" },
      alternatives: [
        { channelRef: f.request.channelRef, discountPercent: "0" },
        { channelRef: f.request.channelRef, discountPercent: "10" },
      ],
    },
  };
}
it("saves one immutable group with two snapshots and replays concurrently", async () => {
  const { actor, draft } = await fixture();
  const key = randomUUID();
  const [a, b] = await Promise.all([
    createPricingComparison(actor, draft, key),
    createPricingComparison(actor, draft, key),
  ]);
  expect(a.id).toBe(b.id);
  expect(a.alternatives).toHaveLength(2);
  expect(await db.pricingSnapshot.count()).toBe(2);
  expect(await db.pricingComparison.count()).toBe(1);
  await expect(
    createPricingComparison(actor, { ...draft, name: "Outro" }, key),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await listPricingComparisons(actor, { search: "nomeado", limit: 1 }),
  ).toMatchObject({
    items: [{ id: a.id, quantity: 10, count: 2 }],
    nextCursor: null,
  });
});
it("reads frozen results after deactivation but rejects fresh requests with no partial writes", async () => {
  const { actor, draft, material } = await fixture();
  const saved = await createPricingComparison(actor, draft, randomUUID());
  await db.material.update({
    where: { id: material.id },
    data: { active: false, version: { increment: 1 } },
  });
  expect(
    await getPricingComparison({ ...actor, role: "OPERATOR" }, saved.id),
  ).toEqual(saved);
  await expect(
    createPricingComparison(actor, draft, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.pricingComparison.count()).toBe(1);
  expect(await db.pricingSnapshot.count()).toBe(2);
});
it("rejects a stale second channel atomically and rejects forged results", async () => {
  const { actor, draft } = await fixture();
  await expect(
    createPricingComparison(
      actor,
      {
        ...draft,
        alternatives: [
          ...draft.alternatives,
          { channelRef: { id: "missing", version: 1 }, discountPercent: "0" },
        ],
      },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.pricingSnapshot.count()).toBe(0);
  expect(await db.pricingComparison.count()).toBe(0);
  await expect(
    createPricingComparison(
      actor,
      { ...draft, result: "forged" },
      randomUUID(),
    ),
  ).rejects.toThrow();
});
it("saves losses and remains replayable after catalog changes", async () => {
  const { actor, draft } = await fixture();
  const key = randomUUID();
  const body = {
    ...draft,
    alternatives: [{ ...draft.alternatives[0], discountPercent: "100" }],
  };
  const a = await createPricingComparison(actor, body, key);
  expect(a.alternatives[0].result.contributionMargin).toBeNull();
  await db.pricingSettings.update({
    where: { id: 1 },
    data: { version: { increment: 1 } },
  });
  expect(await createPricingComparison(actor, body, key)).toEqual(a);
});
it("rolls back snapshots and header when the second item cannot be persisted", async () => {
  const { actor, draft } = await fixture();
  await db.$executeRawUnsafe(
    `CREATE FUNCTION e12_fail_second() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.position = 1 THEN RAISE EXCEPTION 'synthetic second item failure'; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER e12_second BEFORE INSERT ON "PricingComparisonItem" FOR EACH ROW EXECUTE FUNCTION e12_fail_second()`,
  );
  try {
    await expect(
      createPricingComparison(actor, draft, randomUUID()),
    ).rejects.toThrow();
    expect(await db.pricingComparison.count()).toBe(0);
    expect(await db.pricingSnapshot.count()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      'DROP TRIGGER e12_second ON "PricingComparisonItem"',
    );
    await db.$executeRawUnsafe("DROP FUNCTION e12_fail_second()");
  }
});
it("paginates deterministically without exposing snapshot payloads in summaries", async () => {
  const { actor, draft } = await fixture();
  await createPricingComparison(actor, draft, randomUUID());
  await createPricingComparison(
    actor,
    { ...draft, name: "Segundo" },
    randomUUID(),
  );
  const first = await listPricingComparisons(actor, { limit: 1 });
  expect(first.nextCursor).toBeTruthy();
  expect(first.items[0]).not.toHaveProperty("alternatives");
  const second = await listPricingComparisons(actor, {
    limit: 1,
    cursor: first.nextCursor!,
  });
  expect(second.items[0].id).not.toBe(first.items[0].id);
  expect(second.nextCursor).toBeNull();
});
it("observes a real catalog lock and rejects a concurrent changed version", async () => {
  const { actor, draft } = await fixture();
  let release!: () => void, ready!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const locked = new Promise<void>((r) => {
    ready = r;
  });
  const holding = db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PricingSettings" WHERE "id" = 1 FOR UPDATE`;
      await tx.pricingSettings.update({
        where: { id: 1 },
        data: { version: { increment: 1 } },
      });
      ready();
      await gate;
    },
    { timeout: 10000 },
  );
  await locked;
  const observer = new PrismaClient();
  const pending = Promise.allSettled([
    createPricingComparison(actor, draft, randomUUID()),
  ]);
  let observed = false;
  try {
    const start = Date.now();
    while (Date.now() - start < 4000) {
      const [state] = await observer.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`;
      if (Number(state.count) >= 1) {
        observed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  } finally {
    release();
    await holding;
    await observer.$disconnect();
  }
  expect(observed).toBe(true);
  expect((await pending)[0]).toMatchObject({
    status: "rejected",
    reason: { code: "CONFLICT" },
  });
  expect(await db.pricingSnapshot.count()).toBe(0);
});
