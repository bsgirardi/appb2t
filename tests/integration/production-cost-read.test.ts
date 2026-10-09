import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { readProductionCost } from "@/server/production/cost-sources";
setupDatabase();
it("reads production costs in a read-only transaction without writing revisions or locks", async () => {
  const a = await seedUser();
  const o = await db.productionOrder.create({
    data: {
      origin: "STOCK",
      status: "CONCLUIDA",
      lines: {
        create: {
          description: "Peça",
          technology: "FDM",
          targetUnits: 1,
          events: {
            create: {
              kind: "REPORT",
              goodUnits: 1,
              materialComplete: true,
              timeComplete: true,
              setupMinutes: "0",
              finishingMinutes: "0",
              actorId: a.id,
              effectiveDate: new Date("2026-10-09"),
              premises: { manualStage: true },
            },
          },
        },
      },
    },
    include: { lines: true },
  });
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return readProductionCost(tx, o.lines[0].id);
    },
    { isolationLevel: "RepeatableRead" },
  );
  expect(result.result.total).toBe("0");
  expect(result.result.provisional).toBe(false);
  expect(await db.productionCostRevision.count()).toBe(0);
  const first = result.factsHash;
  await db.productionEvent.updateMany({
    where: { lineId: o.lines[0].id },
    data: { materialComplete: false },
  });
  const changed = await db.$transaction((tx) =>
    readProductionCost(tx, o.lines[0].id),
  );
  expect(changed.result.total).toBeNull();
  expect(changed.factsHash).not.toBe(first);
});
