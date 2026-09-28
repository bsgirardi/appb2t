export const calculation = {
  technology: "FDM" as const, consumption: "100", hours: 2, minutes: 0, materialPrice: "100",
  printer: { acquisitionCost: "2400", amortizationMonths: 12, daysPerMonth: 25, hoursPerDay: "8", watts: "100" },
  settings: { energyRate: "1", maintenancePercent: "10", failurePercent: "10", finishingPercent: "10", fixation: "0.2", markupPercent: "200" },
};
export const productInput = { name: "Vaso geométrico", description: "Peça impressa em PLA.", paymentTerms: "Pix ou cartão", active: true, calculation };
