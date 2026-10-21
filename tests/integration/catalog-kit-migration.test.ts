import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("migrates_c2_without_rewriting_history", async () => {
  const schema = `catalog_c3_${randomUUID().replaceAll("-", "")}`;
  const migration = "202610220001_catalog_kits";
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
      for (const directory of directories.filter((d) => d < migration))
        for (const statement of (
          await readFile(`prisma/migrations/${directory}/migration.sql`, "utf8")
        )
          .split(";")
          .filter((s) => s.trim()))
          await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO "Product" (id,name,description,"paymentTerms",calculation,price,"updatedAt") VALUES ('old-product','Histórico','Descrição','Pix','{}',75,NOW())`;
      await tx.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('old-customer','Histórico','PERSON',NOW())`;
      await tx.$executeRaw`INSERT INTO "Quote" (id,status,input,snapshot,totals,"customerId","updatedAt") VALUES ('old-quote','ENVIADO','{"items":[]}','{"company":{"name":"B2T"}}','{"total":"75.00"}','old-customer',NOW())`;
      await tx.$executeRaw`INSERT INTO "CatalogRequest" (id,"attemptHash","contentHash",name,"preferredChannel",contact,"consultCount","updatedAt") VALUES ('old-request','old-attempt','old-content','Histórico','email','{}',0,NOW())`;
      const before =
        await tx.$queryRaw`SELECT md5(to_jsonb(p)::text) hash FROM "Product" p`;
      const quotes =
        await tx.$queryRaw`SELECT md5(row_to_json(q)::text) hash FROM "Quote" q`;
      for (const statement of (
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8")
      )
        .split(";")
        .filter((s) => s.trim()))
        await tx.$executeRawUnsafe(statement);
      expect(
        await tx.$queryRaw`SELECT md5((to_jsonb(p)-'quantityTiers'-'compositionImageId')::text) hash FROM "Product" p`,
      ).toEqual(before);
      // Compare the same column projection on both sides; defaults intentionally add fields.
      expect(
        await tx.$queryRaw`SELECT calculation,price,"quantityTiers","compositionImageId" FROM "Product"`,
      ).toEqual([
        {
          calculation: {},
          price: expect.anything(),
          quantityTiers: [],
          compositionImageId: null,
        },
      ]);
      expect(before).toHaveLength(1);
      expect(
        await tx.$queryRaw`SELECT md5(row_to_json(q)::text) hash FROM "Quote" q`,
      ).toEqual(quotes);
      expect(
        await tx.$queryRaw`SELECT "kitSnapshot","attemptHash","contentHash" FROM "CatalogRequest"`,
      ).toEqual([
        {
          kitSnapshot: null,
          attemptHash: "old-attempt",
          contentHash: "old-content",
        },
      ]);
      expect(
        await tx.$queryRaw`SELECT COUNT(*)::int n FROM "CatalogKit"`,
      ).toEqual([{ n: 0 }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    },
    { timeout: 30000 },
  );
});
