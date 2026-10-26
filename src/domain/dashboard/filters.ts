import { parseCivilDate, todaySaoPaulo } from "@/domain/commerce/dates";
import { AppError } from "@/lib/errors";
import { dashboardPanels, type DashboardFilter } from "./types";

export function shiftDay(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function resolveDashboardFilter(
  raw: Record<string, string | string[] | undefined>,
  role: "ADMIN" | "OPERATOR",
  now = new Date(),
): DashboardFilter {
  const get = (key: string) => {
    if (Array.isArray(raw[key]))
      throw new AppError("VALIDATION", "Filtro repetido.");
    return raw[key] as string | undefined;
  };
  const panel = get("panel") ?? "overview";
  if (!dashboardPanels.some((p) => p.id === panel))
    throw new AppError("VALIDATION", "Dashboard inválido.");
  if (role !== "ADMIN" && ["finance", "profitability"].includes(panel))
    throw new AppError(
      "FORBIDDEN",
      "Este dashboard exige acesso de administrador.",
    );
  const today = todaySaoPaulo(now);
  const range = get("range") ?? (raw.from || raw.to ? "custom" : "month");
  if (!["month", "30", "90", "custom"].includes(range))
    throw new AppError("VALIDATION", "Período inválido.");
  const to = parseCivilDate(get("to") ?? today);
  const from = parseCivilDate(
    get("from") ??
      (range === "30" || range === "90"
        ? shiftDay(to, 1 - Number(range))
        : `${to.slice(0, 7)}-01`),
  );
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (days < 1 || days > 366 || to > today)
    throw new AppError(
      "VALIDATION",
      "Escolha um período passado de até 366 dias, com início anterior ao fim.",
    );
  const margin = get("margin");
  if (
    margin !== undefined &&
    (!/^-?\d{1,3}(\.\d{1,2})?$/.test(margin) ||
      Number(margin) < -100 ||
      Number(margin) > 100)
  )
    throw new AppError(
      "VALIDATION",
      "A referência de margem deve estar entre -100 e 100%.",
    );
  return {
    panel: panel as DashboardFilter["panel"],
    from,
    to,
    today,
    range: range as DashboardFilter["range"],
    previousFrom: shiftDay(from, -days),
    previousTo: shiftDay(from, -1),
    ...(margin !== undefined ? { margin } : {}),
  };
}
