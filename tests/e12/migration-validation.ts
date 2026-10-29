import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { assertE12DatabaseUrl } from "./database";
async function main() {
  process.env.DATABASE_URL = assertE12DatabaseUrl(process.env.E12_TEST_DATABASE_URL ?? "").toString();
  const { PrismaClient } = await import("@prisma/client"), db = new PrismaClient();
  try {
    const [state] = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(Number(state.count), 0, "Use um banco E12 descartável vazio; nenhum dado existente será apagado.");
    const scratch = resolve(".superpowers/sdd/2026-10-29-e1-2-canais-descontos/migration-baseline");
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    writeFileSync(join(scratch, "schema.prisma"), execFileSync("git", ["show", "6e901a7:prisma/schema.prisma"], { encoding: "utf8" }));
    for (const e of readdirSync("prisma/migrations", { withFileTypes: true })) if (e.name !== "20261029160000_pricing_comparisons") cpSync(join("prisma/migrations", e.name), join(scratch, "migrations", e.name), { recursive: e.isDirectory() });
    const deploy = (schema: string) => execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", schema], { stdio: "inherit" });
    deploy(join(scratch, "schema.prisma"));
    const { lotFixture } = await import("../fixtures/pricing");
    const { calculateV2 } = await import("../../src/domain/pricing/calculate");
    await db.user.create({ data: { id: "e12-legacy-user", name: "Sintético", email: "e12@example.test", passwordHash: "unusable" } });
    await db.pricingSnapshot.create({ data: { id: "e12-legacy-snapshot", input: lotFixture, result: calculateV2(lotFixture) as never, actorId: "e12-legacy-user", actorName: "Sintético", operationKey: "e12-legacy-operation", requestHash: "legacy" } });
    await db.product.create({ data: { id: "e12-legacy-product", name: "Sintético", description: "Sintética", paymentTerms: "Pix", price: "12.49", calculation: { version: 2, snapshotId: "e12-legacy-snapshot" } } });
    await db.productCalculationRevision.create({ data: { productId: "e12-legacy-product", productVersion: 1, actorId: "e12-legacy-user", actorName: "Sintético", calculation: { version: 2, snapshotId: "e12-legacy-snapshot" } } });
    await db.customer.create({ data: { id: "e12-legacy-customer", name: "Sintético", type: "COMPANY" } });
    await db.quote.create({ data: { id: "e12-legacy-quote", customerId: "e12-legacy-customer", input: {}, totals: { total: "124.90" } } });
    await db.documentCostRevision.create({ data: { quoteId: "e12-legacy-quote", revision: 1, bindings: [{ lineId: "legacy-line", snapshotId: "e12-legacy-snapshot", fingerprint: "legacy", state: "VALID" }] } });
    const tables = ["User", "PricingSnapshot", "Product", "ProductCalculationRevision", "Customer", "Quote", "DocumentCostRevision"];
    const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, await db.$queryRawUnsafe(`SELECT to_jsonb(t) AS data FROM "${table}" t ORDER BY id`)])));
    const before = await snapshot();
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    assert.equal(await db.pricingComparison.count(), 0);
    assert.equal(await db.pricingComparisonItem.count(), 0);
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    console.log(`PASS E1.2: upgrade/reaplicação; ${tables.length} projeções legadas preservadas, sem backfill.`);
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
