import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { lotFixture as f } from "./pricing";
export const pricingCatalog: PricingCatalogDTO = {
  settings: {
    version: 1,
    energyRate: "1",
    maintenancePerHour: "0.5",
    failurePercent: "0",
    laborPerHour: "20",
    markupPercent: "100",
    targetMarginPercent: "30",
  },
  materials: f.materials.map((m) => ({
    id: m.ref.id,
    version: 1,
    name: m.name,
    technology: "FDM",
    active: true,
    price: m.pricePerBase,
  })),
  printers: [
    {
      id: "p",
      version: 1,
      name: "Impressora",
      technology: "FDM",
      active: true,
      acquisitionCost: "2400",
      amortizationMonths: 12,
      daysPerMonth: 25,
      hoursPerDay: "8",
      watts: "100",
    },
  ],
  extras: [
    { id: "e", version: 1, name: "Embalagem", unitCost: "1", active: true },
  ],
  channels: [
    {
      id: "c",
      version: 1,
      name: "Direto",
      fees: [{ label: "Taxa", percent: "10" }],
      fixedCost: "2",
      active: true,
    },
  ],
};
