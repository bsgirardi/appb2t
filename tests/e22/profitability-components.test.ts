import { Prisma } from "@prisma/client";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { fixture } from "./fixtures";
import { readSaleSources } from "@/server/profitability/sources";
import { calculateSale } from "@/domain/profitability/calculate";
import { reconcileProductiveLine } from "@/domain/profitability/productive-reconciliation";
import {
  recordAssessment,
  getAssessment,
} from "@/server/profitability/assessments";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
setupDatabase();
async function read(id: string) {
  const [source] = await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return readSaleSources(tx, [id]);
    },
    { isolationLevel: "RepeatableRead" },
  );
  const value = calculateSale(source);
  return {
    source,
    value,
    explanation: reconcileProductiveLine(value.lines[0], value.administrative),
  };
}
it("reads frozen components under READ ONLY and ignores current catalog changes", async () => {
  const f = await fixture();
  await f.review();
  const before = await read(f.saleId);
  expect(before.source.lines[0].expected?.components).toEqual({
    material: "50",
    energy: "5",
    maintenance: "5",
    labor: "20",
    extras: "10",
    failure: "6",
  });
  expect(before.value.lines[0].expectedScenario.productive.value).toBe("96");
  expect(before.explanation.aggregateEffect.value).toBe("16");
  expect(before.explanation.closed).toBe(true);
  await db.pricingSettings.create({
    data: { id: 1, values: { laborPerHour: "999" }, updatedById: f.actor.id },
  });
  expect((await read(f.saleId)).source.lines[0].expected).toEqual(
    before.source.lines[0].expected,
  );
  expect(await db.productionCostRevision.count()).toBe(0);
});
it.each(["missing", "invalid", "binding"])(
  "preserves total and honest coverage for %s snapshot data",
  async (condition) => {
    const f = await fixture();
    if (condition === "binding")
      await db.saleItem.updateMany({
        where: { saleId: f.saleId },
        data: { description: "Descrição alterada" },
      });
    else {
      const result = f.snapshot.result as Record<string, Prisma.JsonValue>;
      if (condition === "missing") delete result.material;
      else result.material = "NaN";
      await db.pricingSnapshot.update({
        where: { id: f.snapshot.id },
        data: { result: result as Prisma.InputJsonValue },
      });
    }
    const r = await read(f.saleId);
    expect(r.source.lines[0].expected?.components).toBeUndefined();
    if (condition !== "binding")
      expect(r.source.lines[0].expected?.variable).toBe("96");
    else expect(r.source.lines[0].expected).toBeNull();
    expect(r.explanation.closed).toBe(false);
  },
);
it.each(["U3_SOURCE", "NOT_OCCURRED", "COMPLEMENT"] as const)(
  "counts extra confirmed as %s exactly once",
  async (kind) => {
    const f = await fixture();
    await f.review(kind);
    const r = await read(f.saleId);
    expect(r.value.actual.productive.value).toBe(
      kind === "COMPLEMENT" ? "90" : "80",
    );
    expect(r.explanation.aggregateEffect.value).toBe(
      kind === "COMPLEMENT" ? "6" : "16",
    );
    expect(
      r.explanation.rows.find((row) => row.key === "extras")?.actual.value,
    ).toBe(kind === "COMPLEMENT" ? "10" : "0");
    expect(r.explanation.closed).toBe(true);
  },
);
it("does not charge failures in a mixed good/failed event again and includes closed LOSS once", async () => {
  const f = await fixture();
  await db.productionEvent.update({
    where: { id: f.eventId },
    data: { failedUnits: 2, reason: "Falha sintética" },
  });
  await f.review();
  expect((await read(f.saleId)).value.actual.productive.value).toBe("80");
  const loss = await db.productionOrder.create({
    data: {
      origin: "SALE",
      saleId: f.saleId,
      status: "CONCLUIDA",
      lines: {
        create: {
          saleLineKey: "line1",
          description: "Perda",
          technology: "FDM",
          targetUnits: 1,
          events: {
            create: {
              kind: "REPORT",
              goodUnits: 0,
              failedUnits: 1,
              reason: "Falha",
              materialComplete: true,
              timeComplete: true,
              machineMinutes: "0",
              setupMinutes: "60",
              finishingMinutes: "0",
              premises: { settings: { values: { laborPerHour: "30" } } },
              actorId: f.actor.id,
              effectiveDate: new Date("2026-10-30"),
            },
          },
        },
      },
    },
    include: { lines: true },
  });
  await f.review("NOT_OCCURRED", 1);
  const r = await read(f.saleId);
  expect(r.value.actual.productive.value).toBe("110");
  expect(r.explanation.aggregateEffect.value).toBe("-14");
  expect(r.explanation.includedLosses).toMatchObject([
    { id: loss.lines[0].id, value: "30" },
  ]);
  expect(r.explanation.closed).toBe(true);
});
it("retains opening totals without inventing a component breakdown", async () => {
  const f = await fixture("OPENING");
  await f.review();
  const r = await read(f.saleId);
  expect(r.source.lines[0].actual.total).toBe("85");
  expect(r.source.lines[0].actual.components).toBeNull();
  expect(r.explanation.closed).toBe(false);
  expect(r.explanation.rows[0].actual.value).toBeNull();
});
it("keeps historical JSON and old review hashes unchanged after enrichment", async () => {
  const f = await fixture();
  // Synthetic rollout: the same totals initially lack readable composition.
  const legacyResult = { ...(f.snapshot.result as Prisma.JsonObject) };
  delete legacyResult.material;
  await db.pricingSnapshot.update({
    where: { id: f.snapshot.id },
    data: { result: legacyResult },
  });
  const previous = await f.review();
  const old = await recordAssessment(f.actor, {
    saleId: f.saleId,
    operationKey: crypto.randomUUID(),
  });
  expect(old.input.lines[0].expected?.components).toBeUndefined();
  expect(old.result.actual.productive.value).toBe("80");
  const oldHash = old.input.lines[0].sourceHash;
  await db.pricingSnapshot.update({
    where: { id: f.snapshot.id },
    data: { result: f.snapshot.result as Prisma.InputJsonValue },
  });
  const { source, value } = await read(f.saleId);
  expect(source.lines[0].sourceHash).not.toBe(oldHash);
  expect(source.administrative?.lineReviews[0].sourceHash).toBe(oldHash);
  expect(value.lines[0].actualScenario.productive.reasons).toContain(
    "Extras precisam de conferência",
  );
  expect(
    await db.profitabilityRevision.findUnique({ where: { id: previous.id } }),
  ).toMatchObject({
    payload: {
      lineReviews: [{ lineKey: "line1", sourceHash: oldHash, complete: true }],
    },
  });
  await expect(
    saveProfitabilityRevision(f.actor, {
      saleId: f.saleId,
      expectedVersion: 1,
      operationKey: crypto.randomUUID(),
      effectiveDate: "2026-10-30",
      reason: "Conferência antiga",
      payload: {
        ...source.administrative,
        channel: null,
        expectedShipping: { state: "UNKNOWN" },
        fees: { state: "UNKNOWN" },
        shipping: { state: "UNKNOWN" },
        extras: [],
        confirmations: [],
        lineReviews: [
          { lineKey: "line1", sourceHash: oldHash, complete: true },
        ],
        commercialPending: false,
        commercialReason: "",
      },
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await f.review("NOT_OCCURRED", 1);
  const current = await recordAssessment(f.actor, {
    saleId: f.saleId,
    operationKey: crypto.randomUUID(),
  });
  expect(current.input.lines[0].expected?.components?.material).toBe("50");
  expect(current.engineVersion).toBe("u4-v1");
  const saved = await getAssessment(f.actor, old.id);
  expect(saved.input).toEqual(old.input);
  expect(saved.result).toEqual(old.result);
  expect(
    reconcileProductiveLine(saved.result.lines[0], saved.input.administrative)
      .closed,
  ).toBe(false);
});
it("preserves partial-delivery and provisional limits", async () => {
  const f = await fixture();
  await db.productionEvent.update({
    where: { id: f.eventId },
    data: { materialComplete: false },
  });
  await f.review();
  const r = await read(f.saleId);
  expect(r.source.lines[0].actual.provisional).toBe(true);
  expect(r.explanation.closed).toBe(false);
  expect(r.explanation.unexplained.value).toBeNull();
});
it("partitions a production line between two origins and counts each delivered part once", async () => {
  const f = await fixture();
  await db.saleItem.updateMany({
    where: { saleId: f.saleId },
    data: { quantity: 2, unitPrice: "100" },
  });
  const secondEvent = await db.productionEvent.create({
    data: {
      lineId: f.lineId!,
      kind: "REPORT",
      goodUnits: 1,
      machineMinutes: "0",
      setupMinutes: "0",
      finishingMinutes: "0",
      materialComplete: true,
      timeComplete: true,
      actorId: f.actor.id,
      effectiveDate: new Date("2026-10-30"),
      premises: {},
    },
  });
  const firstOrigin = await db.finishedOrigin.findUniqueOrThrow({
    where: { id: f.originId },
  });
  const second = await db.finishedOrigin.create({
    data: {
      stockId: firstOrigin.stockId,
      kind: "PRODUCTION",
      lineId: f.lineId,
      eventId: secondEvent.id,
      movements: {
        create: {
          kind: "PRODUCTION",
          units: 1,
          actorId: f.actor.id,
          effectiveDate: new Date("2026-10-30"),
        },
      },
    },
  });
  const partial = await read(f.saleId);
  expect(partial.source.lines[0].actual).toMatchObject({
    delivered: 1,
    total: "42.5",
    components: { labor: "40", depreciation: "2.5" },
  });
  expect(partial.value.lines[0].actualScenario.productive.reasons).toContain(
    "Entrega incompleta",
  );
  const commitment = await db.finishedCommitment.create({
    data: { saleId: f.saleId, lineKey: "line1", originId: second.id },
  });
  const movement = await db.finishedMovement.create({
    data: {
      originId: second.id,
      kind: "DELIVERY",
      units: -1,
      actorId: f.actor.id,
      effectiveDate: new Date("2026-10-30"),
    },
  });
  const firstDelivery = await db.productionDeliveryLine.findUniqueOrThrow({
    where: { id: f.deliveryLineId },
  });
  await db.productionDeliveryLine.create({
    data: {
      deliveryId: firstDelivery.deliveryId,
      commitmentId: commitment.id,
      lineKey: "line1",
      units: 1,
      movementId: movement.id,
    },
  });
  const complete = await read(f.saleId);
  expect(complete.source.lines[0].actual).toMatchObject({
    delivered: 2,
    total: "85",
    components: { labor: "80", depreciation: "5" },
  });
  expect(complete.source.lines[0].actual.sources).toHaveLength(2);
});
