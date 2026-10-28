/** Run only on a fresh disposable E4 database; applies baseline then E4 migrations. */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { assertE4DatabaseUrl } from "./database";
async function main() {
  const url = assertE4DatabaseUrl(process.env.E4_TEST_DATABASE_URL ?? "");
  process.env.DATABASE_URL = url.toString();
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const scratch = resolve(
    ".superpowers/sdd/2026-10-27-e4-negociacoes/migration-baseline",
  );
  const newMigration = "20261028011000_opportunities";
  const prismaCli = resolve("node_modules/prisma/build/index.js");
  const run = (args: string[]) =>
    execFileSync(process.execPath, [prismaCli, ...args], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url.toString() },
    });
  try {
    const present = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(
      Number(present[0].count),
      0,
      "Use a fresh E4 database; existing data must not be reset.",
    );
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    writeFileSync(
      join(scratch, "schema.prisma"),
      execFileSync("git", ["show", "d74ee75:prisma/schema.prisma"], {
        encoding: "utf8",
      }),
    );
    for (const entry of readdirSync("prisma/migrations", {
      withFileTypes: true,
    }))
      if (entry.name !== newMigration)
        cpSync(
          join("prisma/migrations", entry.name),
          join(scratch, "migrations", entry.name),
          { recursive: entry.isDirectory() },
        );
    run(["migrate", "deploy", "--schema", join(scratch, "schema.prisma")]);
    await db.$executeRaw`INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES ('e4-legacy-user','Equipe sintética','migration@example.test','unusable-test-hash',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('e4-legacy-customer','Cliente sintético','PERSON',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Quote" (id,"customerId",status,input,totals,snapshot,"validUntil",version,"updatedAt") VALUES ('e4-legacy-quote','e4-legacy-customer','CONVERTIDO','{"customerId":"e4-legacy-customer","internalNotes":"synthetic-legacy"}'::jsonb,'{"total":"50.00"}'::jsonb,'{"company":{"name":"Empresa sintética"}}'::jsonb,'2026-10-29',7,CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Sale" (id,"quoteId","customerId",status,document,totals,"updatedAt") VALUES ('e4-legacy-sale','e4-legacy-quote','e4-legacy-customer','CONFIRMADA','{"customerId":"e4-legacy-customer"}'::jsonb,'{"total":"50.00"}'::jsonb,CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "SaleInstallment" (id,"saleId",number,amount,"dueDate") VALUES ('e4-legacy-installment','e4-legacy-sale',1,50,'2026-10-29')`;
    await db.$executeRaw`INSERT INTO "FinancialEntry" (id,kind,amount,"dueDate",description,counterparty,"customerId","saleInstallmentId","updatedAt") VALUES ('e4-legacy-entry','RECEIVABLE',50,'2026-10-29','Venda sintética','Cliente sintético','e4-legacy-customer','e4-legacy-installment',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "CommerceEvent" (id,"quoteId",action,"actorId","actorName") VALUES ('e4-legacy-event','e4-legacy-quote','CONVERT','e4-legacy-user','Equipe sintética')`;
    const tables = [
      "User",
      "Customer",
      "Quote",
      "Sale",
      "SaleInstallment",
      "FinancialEntry",
      "CommerceEvent",
    ];
    async function snapshot() {
      const result: Record<string, unknown> = {};
      for (const table of tables)
        result[table] = await db.$queryRawUnsafe(
          `SELECT to_jsonb(t) - 'opportunityId' AS data FROM "${table}" t ORDER BY id`,
        );
      return result;
    }
    const before = await snapshot();
    run(["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
    assert.deepEqual(
      await snapshot(),
      before,
      "Migration changed legacy commercial data",
    );
    assert.equal(await db.opportunity.count(), 0);
    assert.equal(
      (await db.quote.findUniqueOrThrow({ where: { id: "e4-legacy-quote" } }))
        .opportunityId,
      null,
    );
    run(["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
    assert.deepEqual(
      await snapshot(),
      before,
      "Repeated deploy changed legacy data",
    );
    await assert.rejects(
      db.opportunity.create({
        data: {
          title: "FK inválida",
          customerId: "missing",
          ownerId: "e4-legacy-user",
        },
      }),
    );
    await db.opportunity.create({
      data: {
        id: "e4-winner",
        title: "Ganho sintético",
        customerId: "e4-legacy-customer",
        ownerId: "e4-legacy-user",
        stage: "GANHO",
        wonSaleId: "e4-legacy-sale",
      },
    });
    await assert.rejects(
      db.opportunity.create({
        data: {
          title: "Duplicação inválida",
          customerId: "e4-legacy-customer",
          ownerId: "e4-legacy-user",
          stage: "GANHO",
          wonSaleId: "e4-legacy-sale",
        },
      }),
    );
    console.log(
      "E4 migration PASS: baseline + legacy fixtures, additive upgrade, repeated deploy, unchanged 7 legacy tables, null links, foreign key and unique winner.",
    );
    writeFileSync(
      resolve(
        ".superpowers/sdd/2026-10-27-e4-negociacoes/migration-result.json",
      ),
      JSON.stringify(
        {
          result: "PASS",
          legacyTables: tables,
          migration: newMigration,
          checks: [
            "additive-upgrade",
            "legacy-preservation",
            "repeat-deploy",
            "no-backfill",
            "foreign-key",
            "unique-winner",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
