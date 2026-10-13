import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { sale } from "../fixtures/production";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
setupDatabase();
it("replays the additive migration without changing preexisting rows", async () => {
  const schema = `planning_migration_${randomUUID().replaceAll("-", "")}`;
  const folders = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((x) => x.isDirectory())
    .map((x) => x.name)
    .sort();
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const dir of folders.filter((x) => x < "202610100001_planning")) {
        for (const statement of (
          await readFile(`prisma/migrations/${dir}/migration.sql`, "utf8")
        )
          .split(";")
          .filter((x) => x.trim()))
          await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('old','Cliente','PERSON',NOW())`;
      await tx.$executeRaw`INSERT INTO "Sale" (id,status,"customerId",document,totals,"updatedAt") VALUES ('old','CONFIRMADA','old','{}','{}',NOW())`;
      await tx.$executeRaw`INSERT INTO "StockItem" (id,name,unit,method,"updatedAt") VALUES ('old','PLA','G','WEIGHTED_AVERAGE',NOW())`;
      await tx.$executeRaw`INSERT INTO "ProductionOrder" (id,origin,"saleId","updatedAt") VALUES ('old','SALE','old',NOW())`;
      const tables = await tx.$queryRaw<
        { tablename: string }[]
      >`SELECT tablename FROM pg_tables WHERE schemaname=${schema}`;
      const snapshots = new Map<string, unknown>();
      for (const { tablename } of tables)
        snapshots.set(
          tablename,
          await tx.$queryRawUnsafe(
            `SELECT row_to_json(t) AS row FROM "${tablename}" t ORDER BY row_to_json(t)::text`,
          ),
        );
      for (const statement of (
        await readFile(
          "prisma/migrations/202610100001_planning/migration.sql",
          "utf8",
        )
      )
        .split(";")
        .filter((x) => x.trim()))
        await tx.$executeRawUnsafe(statement);
      for (const { tablename } of tables)
        expect(
          await tx.$queryRawUnsafe(
            `SELECT row_to_json(t) AS row FROM "${tablename}" t ORDER BY row_to_json(t)::text`,
          ),
        ).toEqual(snapshots.get(tablename));
      expect(
        await tx.$queryRaw`SELECT count(*)::int AS n FROM "PlanningBatch"`,
      ).toEqual([{ n: 0 }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    },
    { timeout: 30000 },
  );
});
it("leaves existing sales intact and starts without fabricated planning data", async () => {
  const s = await sale();
  const before = await db.sale.findUnique({
    where: { id: s.id },
    include: { items: true },
  });
  expect(await db.planningBatch.count()).toBe(0);
  expect(await db.planningCalendar.count()).toBe(0);
  await db.planningState.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  expect(
    await db.sale.findUnique({ where: { id: s.id }, include: { items: true } }),
  ).toEqual(before);
  await expect(
    db.$executeRaw`INSERT INTO "PlanningMaterialCoverage" (id,"participationId","allocationId",quantity) VALUES ('bad','missing','missing',-1)`,
  ).rejects.toThrow();
  await expect(
    db.$executeRaw`INSERT INTO "PlanningParticipation" (id,"batchId","lineId",units,"settledUnits","needQuantity") VALUES ('bad','missing','missing',1,0,0)`,
  ).rejects.toThrow();
});
