import type { PricingSettingsValues } from "./types";

export function maintenanceDescription(
  settings?: Pick<
    PricingSettingsValues,
    "maintenanceMode" | "maintenancePerHour" | "maintenanceFixedPerLot"
  > | null,
) {
  if (!settings) return "não configurada";
  return settings.maintenanceMode === "FIXED_PER_LOT"
    ? `R$ ${settings.maintenanceFixedPerLot ?? "0"}/lote`
    : `R$ ${settings.maintenancePerHour}/hora`;
}
