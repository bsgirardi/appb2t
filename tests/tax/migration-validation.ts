import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, cpSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
async function main() {
  const url = new URL(process.env.TAX_MIGRATION_DATABASE_URL ?? "");
  if (
    process.env.TAX_DISPOSABLE_DATABASE !== "1" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/b2t_tax_migration" ||
    url.username !== "tax_test" ||
    !url.port
  )
    throw Error("Banco de migração exclusivo não confirmado.");
  const env = { ...process.env, DATABASE_URL: url.toString() };
  const baseline = resolve(".b2t/tax/baseline");
  mkdirSync(resolve(baseline, "migrations"), { recursive: true });
  cpSync("prisma/schema.prisma", resolve(baseline, "schema.prisma"));
  for (const entry of readdirSync("prisma/migrations")) {
    if (entry !== "20261107140000_tax_profiles")
      cpSync(
        resolve("prisma/migrations", entry),
        resolve(baseline, "migrations", entry),
        { recursive: true },
      );
  }
  function migrate(schema: string) {
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        schema,
      ],
      { env, stdio: "pipe" },
    );
  }
  migrate(resolve(baseline, "schema.prisma"));
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    await db.$executeRaw`INSERT INTO "PricingSnapshot" (id,input,result,"actorId","actorName","createdAt","operationKey","requestHash") VALUES ('migration-old-pricing','{"version":2,"synthetic":true}'::jsonb,'{"contribution":"42.123456"}'::jsonb,'synthetic','Teste sintético',NOW(),'old-key','old-hash') ON CONFLICT DO NOTHING`;
    await db.$executeRaw`INSERT INTO "Sale" (id,status,version,document,totals,snapshot,"createdAt","updatedAt") VALUES ('migration-old-sale','CONFIRMADA',1,'{"customerIdentification":"UNIDENTIFIED","items":[],"internalNotes":"sintético"}'::jsonb,'{"total":"42.00"}'::jsonb,'{"issuedAt":"2026-10-01T12:00:00Z","synthetic":true}'::jsonb,NOW(),NOW())`;
    const read = async () => ({
      snapshots:
        await db.$queryRaw`SELECT id,input,result,"actorId","actorName","createdAt","operationKey","requestHash" FROM "PricingSnapshot" ORDER BY id`,
      sales:
        await db.$queryRaw`SELECT id,status,version,document,totals,snapshot,"createdAt","updatedAt" FROM "Sale" ORDER BY id`,
    });
    const before = JSON.stringify(await read());
    migrate(resolve("prisma/schema.prisma"));
    assert.equal(JSON.stringify(await read()), before);
    assert.deepEqual(
      await db.$queryRaw`SELECT "taxConfirmedAt" FROM "Sale" WHERE id='migration-old-sale'`,
      [{ taxConfirmedAt: null }],
    );
    assert.deepEqual(
      await db.$queryRaw`SELECT "taxEvidence" FROM "PricingSnapshot" WHERE id='migration-old-pricing'`,
      [{ taxEvidence: null }],
    );
    migrate(resolve("prisma/schema.prisma"));
    assert.equal(JSON.stringify(await read()), before);
    assert.equal(await db.taxProfileRevision.count(), 0);
    assert.equal(await db.taxReportMemory.count(), 0);
    console.log(
      "Migração e reaplicação aprovadas: conteúdo legado preservado, campos novos nulos, sem perfil fiscal fabricado.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
