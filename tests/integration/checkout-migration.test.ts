import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { db } from "@/lib/db";
setupDatabase();
it("keeps checkout links exclusive and requires explicit public authorship", async () => {
  const tables = await db.$queryRaw<
    { name: string }[]
  >`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' AND tablename='Checkout'`;
  expect(tables).toHaveLength(1);
  const a = await db.checkout.create({
    data: {
      attemptHash: "a",
      contentHash: "a",
      draft: {},
      review: {},
      fingerprint: "a",
    },
  });
  await expect(
    db.commerceEvent.create({
      data: { authorKind: "CHECKOUT", actorName: "Ana", action: "CONFIRM" },
    }),
  ).rejects.toThrow();
  const event = await db.commerceEvent.create({
    data: {
      authorKind: "CHECKOUT",
      checkoutId: a.id,
      actorName: "Ana",
      action: "CONFIRM",
    },
  });
  expect(event.actorId).toBeNull();
  await expect(
    db.checkout.create({
      data: {
        attemptHash: "a",
        contentHash: "b",
        draft: {},
        review: {},
        fingerprint: "b",
      },
    }),
  ).rejects.toThrow();
});
