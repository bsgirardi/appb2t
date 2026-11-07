import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { assertTaxDatabase } from "./database";
import { hashPassword } from "@/server/auth/password";
import { getPricingCatalog } from "@/server/pricing/catalog";
import { createPricingEstimate } from "@/server/pricing/estimates";
import { saveSaleDraft, confirmSale } from "@/server/sales";
import { todaySaoPaulo } from "@/domain/commerce/dates";
async function main() {
  assertTaxDatabase();
  const passwordHash = await hashPassword("Tax-preview-2026!");
  const actor = await db.user.upsert({
    where: { email: "tax-admin@example.test" },
    create: {
      name: "Prévia sintética ADMIN",
      role: "ADMIN",
      email: "tax-admin@example.test",
      passwordHash,
    },
    update: {},
  });
  await db.user.upsert({
    where: { email: "tax-operator@example.test" },
    create: {
      name: "Prévia sintética OPERATOR",
      role: "OPERATOR",
      email: "tax-operator@example.test",
      passwordHash,
    },
    update: {},
  });
  const catalog = await getPricingCatalog(actor),
    ref = (v: { id: string; version: number }) => ({
      id: v.id,
      version: v.version,
    });
  const snapshot = await createPricingEstimate(
    actor,
    {
      technology: "FDM",
      quantity: 2,
      materials: [
        {
          ref: ref(catalog.materials[0]),
          consumptionPerUnit: "10",
          fixedWaste: "0",
        },
      ],
      printerRef: ref(catalog.printers[0]),
      machineFixedMinutes: "30",
      machineMinutesPerUnit: "0",
      setupMinutes: "0",
      finishingMinutesPerUnit: "0",
      extras: [],
      channelRef: ref(catalog.channels[0]),
      mode: "INFORMED",
      informedUnitPrice: "50",
      expectedSettingsVersion: catalog.settings!.version,
      tax: {
        competence: todaySaoPaulo(new Date()).slice(0, 7),
        operation: "PRODUCT",
        expectedVersion: catalog.tax!.version,
      },
    },
    randomUUID(),
  );
  const customer = await db.customer.create({
    data: { name: "Cliente da prévia sintética", type: "PERSON" },
  });
  const lineId = randomUUID();
  const draft = await saveSaleDraft(actor, undefined, {
    customerId: customer.id,
    items: [
      { lineId, description: "Peça sintética", quantity: 2, unitPrice: "50" },
    ],
    discount: "0",
    shipping: "0",
    internalNotes: "Prévia descartável",
    paymentTerms: "Pix",
    costBindings: [{ lineId, snapshotId: snapshot.id }],
  });
  await confirmSale(
    actor,
    draft.id,
    draft.version,
    [{ number: 1, amount: "100", dueDate: todaySaoPaulo(new Date()) }],
    randomUUID(),
  );
  console.log("Prévia sintética preparada no banco descartável exclusivo.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
