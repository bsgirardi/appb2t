import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { it, expect } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("adds configuration defaults without rewriting historical product or quote data", async () => {
  const schema = `catalog_c1_${randomUUID().replaceAll("-", "")}`;
  const migration = "202610190001_catalog_configuration";
  const directories = (
    await readdir("prisma/migrations", { withFileTypes: true })
  )
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const directory of directories.filter((d) => d < migration)) {
        const sql = await readFile(
          `prisma/migrations/${directory}/migration.sql`,
          "utf8",
        );
        for (const statement of sql.split(";").filter((s) => s.trim()))
          await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRaw`INSERT INTO "Product" (id,name,description,"paymentTerms",calculation,price,"updatedAt") VALUES ('old-product','Peça histórica','Descrição','Pix','{"technology":"FDM","consumption":"100"}'::jsonb,75,NOW())`;
      await tx.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('old-client','Cliente','PERSON',NOW())`;
      await tx.$executeRaw`INSERT INTO "Quote" (id,status,input,snapshot,totals,"customerId","updatedAt") VALUES ('old-quote','ENVIADO','{"items":[]}'::jsonb,'{"company":{"name":"B2T"}}'::jsonb,'{"total":"75.00"}'::jsonb,'old-client',NOW())`;
      const before =
        await tx.$queryRaw`SELECT calculation,price FROM "Product"`;
      const quote =
        await tx.$queryRaw`SELECT input,snapshot,totals FROM "Quote"`;
      for (const statement of (
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8")
      )
        .split(";")
        .filter((s) => s.trim()))
        await tx.$executeRawUnsafe(statement);
      expect(
        await tx.$queryRaw`SELECT calculation,price FROM "Product"`,
      ).toEqual(before);
      expect(
        await tx.$queryRaw`SELECT input,snapshot,totals FROM "Quote"`,
      ).toEqual(quote);
      expect(
        await tx.$queryRaw`SELECT "publicPriceMode","commercialRevision",configuration FROM "Product"`,
      ).toEqual([
        {
          publicPriceMode: "REFERENCE",
          commercialRevision: 1,
          configuration: {},
        },
      ]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    },
    { timeout: 30000 },
  );
});
