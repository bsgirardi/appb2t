import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { profitabilitySale } from "../fixtures/profitability-db";
import { readSaleSources } from "@/server/profitability/sources";
setupDatabase();
it("reads actual components and never writes a production revision", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  const [r] = await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return readSaleSources(tx, [s.saleId]);
    },
    { isolationLevel: "RepeatableRead" },
  );
  expect(r.lines[0].actual).toMatchObject({
    total: "85",
    delivered: 1,
    components: { labor: "80", depreciation: "5" },
  });
  expect(r.confirmedAt).toBe("2026-10-09T12:00:00.000Z");
  expect(await db.productionCostRevision.count()).toBe(0);
  await db.productionEvent.update({
    where: { id: s.eventId },
    data: { materialComplete: false },
  });
  const [changed] = await db.$transaction((tx) =>
    readSaleSources(tx, [s.saleId]),
  );
  expect(changed.lines[0].actual.total).toBeNull();
  expect(changed.lines[0].sourceHash).not.toBe(r.lines[0].sourceHash);
});
it("retains opening valuation without inventing depreciation or confirmation date", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id, "OPENING");
  await db.commerceEvent.deleteMany({ where: { saleId: s.saleId } });
  const [r] = await db.$transaction((tx) => readSaleSources(tx, [s.saleId]));
  expect(r.lines[0].actual.total).toBe("85");
  expect(r.lines[0].actual.components).toBeNull();
  expect(r.confirmedAt).toBeNull();
});
