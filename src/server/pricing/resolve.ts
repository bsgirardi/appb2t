import type { Prisma } from "@prisma/client";
import type { Actor } from "../auth/session";
import { printerDTO } from "../catalog-inputs";
import { pricingSettingsSchema, feesSchema } from "@/domain/pricing/validation";
import { resolveCatalogPricing } from "@/domain/pricing/resolve";
export async function resolvePricingRequest(
  tx: Prisma.TransactionClient,
  _actor: Actor,
  raw: unknown,
) {
  const [s, materials, printers, channels, extras] = await Promise.all([
    tx.pricingSettings.findUnique({ where: { id: 1 } }),
    tx.material.findMany({ where: { active: true } }),
    tx.printer.findMany({ where: { active: true } }),
    tx.pricingChannel.findMany({ where: { active: true } }),
    tx.pricingExtra.findMany({ where: { active: true } }),
  ]);
  return resolveCatalogPricing(
    {
      settings: s
        ? { ...pricingSettingsSchema.parse(s.values), version: s.version }
        : null,
      materials: materials.map((m) => ({ ...m, price: m.price.toString() })),
      printers: printers.map(printerDTO),
      channels: channels.map((c) => ({
        ...c,
        fees: feesSchema.parse(c.fees),
        fixedCost: c.fixedCost.toString(),
      })),
      extras: extras.map((e) => ({ ...e, unitCost: e.unitCost.toString() })),
    },
    raw,
  );
}
