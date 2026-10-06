import { seedUser } from "../integration/setup";
import { saveMaterial, savePrinter } from "@/server/catalog-inputs";
import {
  savePricingSettings,
  savePricingChannel,
  savePricingExtra,
} from "@/server/pricing/catalog";
import { lotFixture } from "./pricing";
import type { PricingRequest } from "@/domain/pricing/types";
export const pricingRates = {
  energyRate: "1",
  maintenancePerHour: "0.5",
  failurePercent: "0",
  laborPerHour: "20",
  markupPercent: "100",
  targetMarginPercent: "30",
};
export async function pricingFixture() {
  const actor = await seedUser();
  const a = await saveMaterial(actor, {
    name: "PLA A",
    technology: "FDM",
    price: "100",
    active: true,
  });
  const b = await saveMaterial(actor, {
    name: "PLA B",
    technology: "FDM",
    price: "200",
    active: true,
  });
  const { ref: _, name: __, ...printerValues } = lotFixture.printer;
  void _;
  void __;
  const p = await savePrinter(actor, {
    name: "Impressora",
    technology: "FDM",
    active: true,
    ...printerValues,
  });
  const s = await savePricingSettings(actor, {
    ...pricingRates,
    expectedVersion: 0,
  });
  const c = await savePricingChannel(actor, {
    name: "Direto",
    fees: [{ label: "Taxa", percent: "10" }],
    fixedCost: "2",
    active: true,
    expectedVersion: 0,
  });
  const e = await savePricingExtra(actor, {
    name: "Caixa",
    unitCost: "1",
    active: true,
    expectedVersion: 0,
  });
  const request: PricingRequest = {
    technology: "FDM",
    quantity: 10,
    materials: [
      {
        ref: { id: a.id, version: a.version },
        consumptionPerUnit: "10",
        fixedWaste: "10",
      },
      {
        ref: { id: b.id, version: b.version },
        consumptionPerUnit: "5",
        fixedWaste: "0",
      },
    ],
    printerRef: { id: p.id, version: p.version },
    machineFixedMinutes: "120",
    machineMinutesPerUnit: "0",
    setupMinutes: "30",
    finishingMinutesPerUnit: "3",
    extras: [
      { ref: { id: e.id, version: e.version }, basis: "UNIT", quantity: "1" },
    ],
    channelRef: { id: c.id, version: c.version },
    mode: "MARKUP",
    informedUnitPrice: "8",
    expectedSettingsVersion: s.version,
  };
  return { actor, request, material: a };
}
