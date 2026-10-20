import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("adds isolated request storage without rewriting historical tables", async () => {
  const sql = await readFile(
    "prisma/migrations/202610200001_catalog_requests/migration.sql",
    "utf8",
  );
  const schema = `c2_${randomUUID().replaceAll("-", "")}`;
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    for (const directory of (await readdir("prisma/migrations")).filter(d => /^\d/.test(d) && d < "202610200001_catalog_requests").sort()) {
      const previous = await readFile(`prisma/migrations/${directory}/migration.sql`, "utf8");
      for (const statement of previous.split(";").filter(s => s.trim())) await tx.$executeRawUnsafe(statement);
    }
    await tx.$executeRawUnsafe(`INSERT INTO "Product" (id,name,description,"paymentTerms",calculation,price,"updatedAt") VALUES ('old-product','Histórico','Descrição','Pix','{}'::jsonb,75,NOW())`);
    await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('old-client','Cliente','PERSON',NOW())`);
    await tx.$executeRawUnsafe(`INSERT INTO "Quote" (id,status,input,snapshot,totals,"customerId","updatedAt") VALUES ('old-quote','ENVIADO','{"items":[]}'::jsonb,'{"company":{"name":"Original"}}'::jsonb,'{"total":"75.00"}'::jsonb,'old-client',NOW())`);
    const hashes = () => tx.$queryRaw`SELECT 'Product' AS name, md5(row_to_json(p)::text) AS hash FROM "Product" p UNION ALL SELECT 'Customer',md5(row_to_json(c)::text) FROM "Customer" c UNION ALL SELECT 'Quote',md5(row_to_json(q)::text) FROM "Quote" q ORDER BY name`;
    const before = await hashes();
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await tx.$executeRawUnsafe(statement);
    expect(await hashes()).toEqual(before);
    expect(
      await tx.$queryRaw`SELECT count(*)::int AS count FROM "CatalogRequest"`,
    ).toEqual([{ count: 0 }]);
    await tx.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  });
});
