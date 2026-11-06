import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "../../src/lib/db";
import { assertPosDatabaseUrl } from "./database";
async function main() {
  assertPosDatabaseUrl(process.env.DATABASE_URL ?? "");
  try {
    // This database is exclusive and disposable. Reconstruct the previous NOT NULL
    // contract with a real synthetic legacy sale, then apply the exact forward SQL.
    await db.$executeRawUnsafe(
      'TRUNCATE "User", "Customer", "Product", "Sale", "FinancialCategory", "FinishedStock" CASCADE',
    );
    const customer = await db.customer.create({
      data: { name: "Cliente legado sintético", type: "PERSON" },
    });
    const document = {
      customerId: customer.id,
      items: [{ description: "Legado", quantity: 1, unitPrice: "10.00" }],
      discount: "0.00",
      shipping: "0.00",
      paymentTerms: "Pix",
      internalNotes: "",
    };
    const sale = await db.sale.create({
      data: {
        customerId: customer.id,
        document,
        totals: {
          subtotal: "10.00",
          discount: "0.00",
          shipping: "0.00",
          total: "10.00",
        },
        items: {
          create: {
            position: 0,
            description: "Legado",
            quantity: 1,
            unitPrice: "10.00",
          },
        },
      },
    });
    const before = JSON.stringify(
      await db.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { items: true },
      }),
    );
    await db.$executeRawUnsafe('DROP TABLE "PosOrder"');
    await db.$executeRawUnsafe(
      'ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_unidentified_document_check"',
    );
    await db.$executeRawUnsafe(
      'ALTER TABLE "Sale" ALTER COLUMN "customerId" SET NOT NULL',
    );
    const sql = await readFile(
      "prisma/migrations/20261106210000_pos/migration.sql",
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.$executeRawUnsafe(statement);
    assert.equal(
      JSON.stringify(
        await db.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: { items: true },
        }),
      ),
      before,
    );
    await assert.rejects(
      db.sale.create({ data: { customerId: null, document, totals: {} } }),
    );
    assert.equal(await db.posOrder.count(), 0);
    console.log(
      "Migração PDV aplicada ao contrato anterior: venda, cliente e item legados preservados; anonimato sem marcador rejeitado.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
