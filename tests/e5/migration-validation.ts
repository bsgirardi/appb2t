import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { assertE5DatabaseUrl } from "./database";
async function main() {
  const url = assertE5DatabaseUrl(process.env.E5_TEST_DATABASE_URL ?? "");
  process.env.DATABASE_URL = url.toString();
  const { PrismaClient } = await import("@prisma/client"),
    db = new PrismaClient();
  const scratch = resolve(
    ".superpowers/sdd/2026-10-28-e5-consignacao/migration-baseline",
  );
  const migration = "202610280001_consignment";
  const run = (schema: string) =>
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
        "--schema",
        schema,
      ],
      { stdio: "inherit" },
    );
  try {
    const rows = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(
      Number(rows[0].count),
      0,
      "Use um banco E5 descartável vazio; nenhum dado existente será apagado.",
    );
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    writeFileSync(
      join(scratch, "schema.prisma"),
      execFileSync("git", ["show", "7fe37d9:prisma/schema.prisma"], {
        encoding: "utf8",
      }),
    );
    for (const entry of readdirSync("prisma/migrations", {
      withFileTypes: true,
    }))
      if (entry.name !== migration)
        cpSync(
          join("prisma/migrations", entry.name),
          join(scratch, "migrations", entry.name),
          { recursive: entry.isDirectory() },
        );
    run(join(scratch, "schema.prisma"));
    await db.$executeRaw`INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES ('e5-legacy-user','Sintético','legacy@example.test','unusable',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Customer" (id,name,type,"updatedAt") VALUES ('e5-legacy-customer','Sintético','COMPANY',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "Sale" (id,"customerId",status,document,totals,"updatedAt") VALUES ('e5-legacy-sale','e5-legacy-customer','CONFIRMADA','{}','{"total":"50.00"}',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "SaleInstallment" (id,"saleId",number,amount,"dueDate") VALUES ('e5-legacy-installment','e5-legacy-sale',1,50,'2026-11-10')`;
    await db.$executeRaw`INSERT INTO "FinancialEntry" (id,kind,amount,"dueDate",description,counterparty,"saleInstallmentId","updatedAt") VALUES ('e5-legacy-entry','RECEIVABLE',50,'2026-11-10','Sintético','Sintético','e5-legacy-installment',CURRENT_TIMESTAMP)`;
    const product = await db.product.create({
      data: {
        id: "e5-legacy-product",
        name: "Peça legada",
        description: "Sintética",
        paymentTerms: "Pix",
        calculation: {},
        price: "100",
      },
    });
    const stock = await db.finishedStock.create({
      data: {
        id: "e5-legacy-stock",
        productId: product.id,
        inventoriedAt: new Date(),
      },
    });
    await db.finishedOrigin.create({
      data: {
        id: "e5-legacy-origin",
        stockId: stock.id,
        kind: "OPENING",
        initialValue: "200",
        movements: {
          create: {
            id: "e5-legacy-movement",
            kind: "OPENING",
            units: 20,
            actorId: "e5-legacy-user",
            effectiveDate: new Date("2026-10-28T00:00:00Z"),
          },
        },
      },
    });
    const tables = [
      "User",
      "Customer",
      "Sale",
      "SaleInstallment",
      "FinancialEntry",
      "FinishedStock",
      "FinishedOrigin",
      "FinishedMovement",
    ];
    const snapshot = async () => {
      const values: Record<string, unknown> = {};
      for (const table of tables)
        values[table] = await db.$queryRawUnsafe(
          `SELECT to_jsonb(t) AS data FROM "${table}" t ORDER BY id`,
        );
      return values;
    };
    const before = await snapshot();
    run("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    assert.equal(await db.partner.count(), 0);
    run("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    await assert.rejects(
      db.partner.create({
        data: {
          customerId: "missing",
          responsibleId: "e5-legacy-user",
          location: "Loja",
          model: "RETIDA",
          percent: "20",
          dueDay: 10,
        },
      }),
    );
    const data = {
      customerId: "e5-legacy-customer",
      responsibleId: "e5-legacy-user",
      location: "Loja",
      model: "RETIDA" as const,
      percent: "20",
      dueDay: 10,
    };
    await db.partner.create({ data });
    await assert.rejects(db.partner.create({ data }));
    await assert.rejects(
      db.finishedMovement.create({
        data: {
          originId: "e5-legacy-origin",
          kind: "CONSIGNMENT_OUT",
          units: 1,
          actorId: "e5-legacy-user",
          effectiveDate: new Date("2026-10-28T00:00:00Z"),
        },
      }),
    );
    await assert.rejects(
      db.finishedMovement.create({
        data: {
          originId: "e5-legacy-origin",
          kind: "CONSIGNMENT_RETURN",
          units: -1,
          actorId: "e5-legacy-user",
          effectiveDate: new Date("2026-10-28T00:00:00Z"),
        },
      }),
    );
    console.log(
      "E5 migration PASS: additive upgrade, unchanged legacy fixtures, repeated deploy, FK and unique partner.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Falha na validação da migração E5; conferir banco exclusivo e evidências locais.",
  );
  process.exitCode = 1;
});
