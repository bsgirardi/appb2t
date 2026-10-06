import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("migrationPreservesV1Documents and adds empty pricing storage", async () => {
  const schema = `pricing_migration_${randomUUID().replaceAll("-", "")}`;
  const dirs = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const migration = "202610050001_pricing_v2";
  const sql = await readFile(
    join("prisma/migrations", migration, "migration.sql"),
    "utf8",
  );
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const dir of dirs.filter((d) => d < migration))
        for (const statement of (
          await readFile(
            join("prisma/migrations", dir, "migration.sql"),
            "utf8",
          )
        )
          .split(";")
          .filter((s) => s.trim()))
          await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO "Product" (id,name,description,"paymentTerms",calculation,price,"updatedAt") VALUES ('old-product','Peça','Antiga','Pix','{"technology":"FDM","consumption":"100"}'::jsonb,75,NOW())`;
      await tx.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('old-client','Cliente','PERSON',NOW())`;
      await tx.$executeRaw`INSERT INTO "Quote" (id,status,input,snapshot,totals,"customerId","updatedAt") VALUES ('old-quote','ENVIADO','{"items":[]}'::jsonb,'{"company":{"name":"B2T"}}'::jsonb,'{"total":"75.00"}'::jsonb,'old-client',NOW())`;
      await tx.$executeRaw`INSERT INTO "Sale" (id,status,"customerId",document,snapshot,totals,"updatedAt") VALUES ('old-sale','CONFIRMADA','old-client','{"items":[]}'::jsonb,'{"company":{"name":"B2T"}}'::jsonb,'{"total":"75.00"}'::jsonb,NOW())`;
      await tx.$executeRaw`INSERT INTO "SaleInstallment" (id,"saleId",number,amount,"dueDate") VALUES ('old-installment','old-sale',1,75,'2026-10-10')`;
      const before =
        await tx.$queryRaw`SELECT calculation,price FROM "Product" WHERE id='old-product'`;
      const quote =
        await tx.$queryRaw`SELECT input,snapshot,totals FROM "Quote"`;
      const sale =
        await tx.$queryRaw`SELECT document,snapshot,totals FROM "Sale"`;
      for (const statement of sql.split(";").filter((s) => s.trim()))
        await tx.$executeRawUnsafe(statement);
      expect(
        await tx.$queryRaw`SELECT calculation,price FROM "Product" WHERE id='old-product'`,
      ).toEqual(before);
      expect(
        await tx.$queryRaw`SELECT input,snapshot,totals FROM "Quote"`,
      ).toEqual(quote);
      expect(
        await tx.$queryRaw`SELECT document,snapshot,totals FROM "Sale"`,
      ).toEqual(sale);
      expect(
        await tx.$queryRaw`SELECT amount::text FROM "SaleInstallment"`,
      ).toEqual([{ amount: "75.00" }]);
      expect(
        await tx.$queryRaw`SELECT COUNT(*)::int AS n FROM "PricingSettings"`,
      ).toEqual([{ n: 0 }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    },
    { timeout: 60000 },
  );
}, 65000);
