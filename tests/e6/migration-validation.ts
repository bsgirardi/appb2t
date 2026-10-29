import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { assertE6DatabaseUrl } from "./database";
async function main() {
  process.env.DATABASE_URL = assertE6DatabaseUrl(
    process.env.E6_TEST_DATABASE_URL ?? "",
  ).toString();
  const { PrismaClient } = await import("@prisma/client"),
    db = new PrismaClient();
  try {
    const [state] = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(
      Number(state.count),
      0,
      "Use um banco E6 descartável vazio; nenhum dado existente será apagado.",
    );
    const scratch = resolve(
        ".superpowers/sdd/2026-10-29-e6-anuncios/migration-baseline",
      ),
      migration = "202610290001_advertising_drafts";
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    writeFileSync(
      join(scratch, "schema.prisma"),
      execFileSync("git", ["show", "e273091:prisma/schema.prisma"], {
        encoding: "utf8",
      }),
    );
    for (const e of readdirSync("prisma/migrations", { withFileTypes: true }))
      if (e.name !== migration)
        cpSync(
          join("prisma/migrations", e.name),
          join(scratch, "migrations", e.name),
          { recursive: e.isDirectory() },
        );
    const deploy = (schema: string) =>
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
    deploy(join(scratch, "schema.prisma"));
    const actor = await db.user.create({
      data: {
        id: "e6-legacy-user",
        name: "Sintético",
        email: "legacy@example.test",
        passwordHash: "unusable",
      },
    });
    const customer = await db.customer.create({
      data: { id: "e6-legacy-customer", name: "Sintético", type: "COMPANY" },
    });
    const product = await db.product.create({
      data: {
        id: "e6-legacy-product",
        name: "Peça legada",
        description: "Sintética",
        paymentTerms: "Pix",
        calculation: {},
        price: "100",
        images: {
          create: {
            id: "e6-legacy-photo",
            bytes: Buffer.from([1, 2, 3]),
            mimeType: "image/webp",
            position: 0,
          },
        },
      },
    });
    await db.$executeRaw`INSERT INTO "Sale" (id,"customerId",status,document,totals,"updatedAt") VALUES ('e6-legacy-sale',${customer.id},'CONFIRMADA','{}','{"total":"50.00"}',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "SaleInstallment" (id,"saleId",number,amount,"dueDate") VALUES ('e6-legacy-installment','e6-legacy-sale',1,50,'2026-11-10')`;
    await db.$executeRaw`INSERT INTO "FinancialEntry" (id,kind,amount,"dueDate",description,counterparty,"saleInstallmentId","updatedAt") VALUES ('e6-legacy-entry','RECEIVABLE',50,'2026-11-10','Sintético','Sintético','e6-legacy-installment',CURRENT_TIMESTAMP)`;
    const stock = await db.finishedStock.create({
      data: {
        id: "e6-legacy-stock",
        productId: product.id,
        inventoriedAt: new Date(),
      },
    });
    await db.finishedOrigin.create({
      data: {
        id: "e6-legacy-origin",
        stockId: stock.id,
        kind: "OPENING",
        initialValue: "200",
        movements: {
          create: {
            id: "e6-legacy-movement",
            kind: "OPENING",
            units: 20,
            actorId: actor.id,
            effectiveDate: new Date("2026-10-29T00:00:00Z"),
          },
        },
      },
    });
    await db.partner.create({
      data: {
        id: "e6-legacy-partner",
        customerId: customer.id,
        responsibleId: actor.id,
        location: "Loja sintética",
        model: "RETIDA",
        percent: "20",
        dueDay: 10,
      },
    });
    const tables = [
      "User",
      "Customer",
      "Product",
      "ProductImage",
      "Sale",
      "SaleInstallment",
      "FinancialEntry",
      "FinishedStock",
      "FinishedOrigin",
      "FinishedMovement",
      "Partner",
    ];
    const snapshot = async () =>
      Object.fromEntries(
        await Promise.all(
          tables.map(async (name) => [
            name,
            await db.$queryRawUnsafe(
              `SELECT to_jsonb(t) AS data FROM "${name}" t ORDER BY id`,
            ),
          ]),
        ),
      );
    const before = await snapshot();
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    assert.equal(await db.advertisingDraft.count(), 0);
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    console.log(
      `PASS E6: migração/reaplicação; ${tables.length} projeções legadas preservadas.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
