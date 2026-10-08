import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("production migration preserves historical documents and creates no execution", async () => {
  const schema = `production_migration_${randomUUID().replaceAll("-", "")}`;
  const dirs = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const migration = "202610070001_production";
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
      await tx.$executeRaw`INSERT INTO "ProductImage" (id,"productId",position,bytes,"mimeType") VALUES ('old-image','old-product',0,decode('89504e470001ff','hex'),'image/png')`;
      await tx.$executeRaw`INSERT INTO "FinancialAccount" (id,name,type,"openingBalance","openingDate","updatedAt") VALUES ('old-account','Banco','BANK',100,'2026-01-01',NOW())`;
      await tx.$executeRaw`INSERT INTO "FinancialEntry" (id,kind,amount,"dueDate",description,counterparty,"updatedAt") VALUES ('old-entry','PAYABLE',25,'2026-01-02','Compra antiga','Fornecedor',NOW())`;
      await tx.$executeRaw`INSERT INTO "Settlement" (id,"entryId","accountId",amount,method,"effectiveDate") VALUES ('old-payment','old-entry','old-account',25,'PIX','2026-01-02')`;
      await tx.$executeRaw`INSERT INTO "CashMovement" (id,"accountId",amount,"effectiveDate",kind,description,"actorId","actorName","settlementId") VALUES ('old-cash','old-account',-25,'2026-01-02','PAYMENT','Pagamento antigo','old-actor','Administrador','old-payment')`;
      const financial =
        await tx.$queryRaw`SELECT row_to_json(e) AS entry FROM "FinancialEntry" e`;
      await tx.$executeRaw`INSERT INTO "StockItem" (id,name,unit,method,"inventoriedAt","updatedAt") VALUES ('old-stock','Material existente','G','WEIGHTED_AVERAGE',NOW(),NOW())`;
      await tx.$executeRaw`INSERT INTO "StockMovement" (id,"itemId",kind,quantity,method,"confirmedValue","actorId","effectiveDate") VALUES ('old-movement','old-stock','OPENING',100,'WEIGHTED_AVERAGE',10,'old-actor','2026-10-01')`;
      await tx.$executeRaw`INSERT INTO "StockReservation" (id,"itemId","saleId","lineKey") VALUES ('old-reservation','old-stock','old-sale','line1')`;
      const oldStock =
        await tx.$queryRaw`SELECT row_to_json(s) FROM "StockMovement" s`;
      const cash =
        await tx.$queryRaw`SELECT row_to_json(m) AS movement FROM "CashMovement" m`;
      const before =
        await tx.$queryRaw`SELECT calculation,price FROM "Product" WHERE id='old-product'`;
      const quote =
        await tx.$queryRaw`SELECT input,snapshot,totals FROM "Quote"`;
      const sale =
        await tx.$queryRaw`SELECT document,snapshot,totals FROM "Sale"`;
      for (const statement of sql.split(";").filter((s) => s.trim()))
        await tx.$executeRawUnsafe(statement);
      for (const dir of dirs.filter((d) => d > migration))
        for (const statement of (
          await readFile(
            join("prisma/migrations", dir, "migration.sql"),
            "utf8",
          )
        )
          .split(";")
          .filter((s) => s.trim()))
          await tx.$executeRawUnsafe(statement);
      expect(
        await tx.$queryRaw`SELECT row_to_json(e) AS entry FROM "FinancialEntry" e`,
      ).toEqual(financial);
      expect(
        await tx.$queryRaw`SELECT row_to_json(m) AS movement FROM "CashMovement" m`,
      ).toEqual(cash);
      expect(
        await tx.$queryRaw`SELECT encode(bytes,'hex') AS bytes FROM "ProductImage"`,
      ).toEqual([{ bytes: "89504e470001ff" }]);
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
        await tx.$queryRaw`SELECT COUNT(*)::int AS n FROM "ProductionOrder"`,
      ).toEqual([{ n: 0 }]);
      expect(
        await tx.$queryRaw`SELECT row_to_json(s) FROM "StockMovement" s`,
      ).toEqual(oldStock);
      expect(await tx.$queryRaw`SELECT "fulfillmentMode" FROM "Sale"`).toEqual([
        { fulfillmentMode: "LEGACY" },
      ]);
      expect(
        await tx.$queryRaw`SELECT "saleId","lineKey","productionLineId" FROM "StockReservation"`,
      ).toEqual([
        { saleId: "old-sale", lineKey: "line1", productionLineId: null },
      ]);
      expect(
        await tx.$queryRaw`SELECT COUNT(*)::int AS n FROM "FinishedMovement"`,
      ).toEqual([{ n: 0 }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    },
    { timeout: 60000 },
  );
}, 65000);
