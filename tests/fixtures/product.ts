export const calculation = {
  technology: "FDM" as const,
  consumption: "100",
  hours: 2,
  minutes: 0,
  materialPrice: "100",
  printer: {
    acquisitionCost: "2400",
    amortizationMonths: 12,
    daysPerMonth: 25,
    hoursPerDay: "8",
    watts: "100",
  },
  settings: {
    energyRate: "1",
    maintenancePercent: "10",
    failurePercent: "10",
    finishingPercent: "10",
    fixation: "0.2",
    markupPercent: "200",
  },
};
export const productInput = {
  images: [{ uploadKey: "a" }],
  price: "75.00",
  name: "Vaso geométrico",
  description: "Peça impressa em PLA.",
  paymentTerms: "Pix ou cartão",
  active: true,
  calculation,
};
export const calculatorData = {
  materials: [
    {
      id: "m",
      name: "PLA",
      technology: "FDM" as const,
      price: "100",
      active: true,
      version: 1,
    },
  ],
  printers: [
    {
      id: "p",
      name: "Impressora",
      technology: "FDM" as const,
      ...calculation.printer,
      active: true,
      version: 1,
    },
  ],
  settings: { ...calculation.settings, version: 1 },
  loadedAt: "2026-09-28T12:00:00Z",
};
export const productDTO = {
  ...productInput,
  images: [
    { id: "photo", url: "/api/products/product/images/photo", position: 0 },
  ],
  id: "product",
  price: "48.19",
  imageUrl: "/api/products/product/image",
  version: 1,
  materialId: "m",
  printerId: "p",
};
