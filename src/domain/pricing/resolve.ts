import { AppError, conflict } from "@/lib/errors";
import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
  Ref,
} from "./types";
import { pricingRequestSchema, pricingV2Schema } from "./validation";
function pick<T extends { id: string; version: number; active: boolean }>(
  rows: T[],
  ref: Ref,
  field: string,
  label: string,
): T {
  const row = rows.find((r) => r.id === ref.id);
  if (!row || !row.active || row.version !== ref.version)
    throw new AppError(
      "CONFLICT",
      `${label}: referência indisponível ou alterada. Revise os parâmetros atuais.`,
      {
        [field]:
          "Referência indisponível ou alterada. Revise os parâmetros atuais.",
      },
    );
  return row;
}
export function resolveCatalogPricing(
  catalog: PricingCatalogDTO,
  raw: unknown,
): PricingV2Input {
  const r = pricingRequestSchema.parse(raw),
    s = catalog.settings;
  if (!s || s.version !== r.expectedSettingsVersion) throw conflict();
  const p = pick(catalog.printers, r.printerRef, "printerRef", "Impressora");
  if (p.technology !== r.technology)
    throw new AppError(
      "VALIDATION",
      "Impressora incompatível com a tecnologia.",
    );
  const channel = pick(
    catalog.channels,
    r.channelRef,
    "channelRef",
    "Canal de venda",
  );
  return pricingV2Schema.parse({
    version: 2,
    technology: r.technology,
    quantity: r.quantity,
    materials: r.materials.map((m, i) => {
      const row = pick(
        catalog.materials,
        m.ref,
        `materials.${i}.ref`,
        `Material ${i + 1}`,
      );
      if (row.technology !== r.technology)
        throw new AppError(
          "VALIDATION",
          "Material incompatível com a tecnologia.",
        );
      return {
        ...m,
        name: row.name,
        unit: r.technology === "FDM" ? "G" : "ML",
        pricePerBase: row.price,
      };
    }),
    printer: {
      ref: r.printerRef,
      name: p.name,
      acquisitionCost: p.acquisitionCost,
      amortizationMonths: p.amortizationMonths,
      daysPerMonth: p.daysPerMonth,
      hoursPerDay: p.hoursPerDay,
      watts: p.watts,
    },
    machineFixedMinutes: r.machineFixedMinutes,
    machineMinutesPerUnit: r.machineMinutesPerUnit,
    setupMinutes: r.setupMinutes,
    finishingMinutesPerUnit: r.finishingMinutesPerUnit,
    energyRate: s.energyRate,
    maintenancePerHour: s.maintenancePerHour,
    failurePercent: s.failurePercent,
    laborPerHour: s.laborPerHour,
    markupPercent: s.markupPercent,
    targetMarginPercent: s.targetMarginPercent,
    extras: r.extras.map((e, i) => {
      const row = pick(
        catalog.extras,
        e.ref,
        `extras.${i}.ref`,
        `Complemento ${i + 1}`,
      );
      return { ...e, name: row.name, unitCost: row.unitCost };
    }),
    channel: {
      ref: r.channelRef,
      name: channel.name,
      fees: channel.fees,
      fixedCost: channel.fixedCost,
    },
    mode: r.mode,
    informedUnitPrice: r.informedUnitPrice,
  });
}
export function requestFromInput(
  input: PricingV2Input,
  settingsVersion: number,
): PricingRequest {
  return {
    technology: input.technology,
    quantity: input.quantity,
    materials: input.materials.map(
      ({ ref, consumptionPerUnit, fixedWaste }) => ({
        ref,
        consumptionPerUnit,
        fixedWaste,
      }),
    ),
    printerRef: input.printer.ref,
    machineFixedMinutes: input.machineFixedMinutes,
    machineMinutesPerUnit: input.machineMinutesPerUnit,
    setupMinutes: input.setupMinutes,
    finishingMinutesPerUnit: input.finishingMinutesPerUnit,
    extras: input.extras.map(({ ref, basis, quantity }) => ({
      ref,
      basis,
      quantity,
    })),
    channelRef: input.channel.ref,
    mode: input.mode,
    informedUnitPrice: input.informedUnitPrice,
    expectedSettingsVersion: settingsVersion,
  };
}
