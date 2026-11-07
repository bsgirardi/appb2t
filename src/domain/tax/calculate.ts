import Decimal from "decimal.js";
import type { TaxPremise, TaxAmount } from "./types";
import { taxPremiseSchema } from "./validation";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function calculateTax(
  base: string,
  raw: TaxPremise | undefined,
  competence?: string,
): TaxAmount {
  const unavailable = (reason: string): TaxAmount => ({
    base,
    unrounded: null,
    amount: null,
    coverage: "UNAVAILABLE",
    reasons: [reason],
  });
  if (!raw) return unavailable("Memória anterior sem tributação identificada.");
  const p = taxPremiseSchema.parse(raw),
    profile = p.profile;
  if (!profile)
    return unavailable("Perfil fiscal não configurado para a competência.");
  if (p.operation !== "PRODUCT")
    return unavailable("Serviço ou outra operação fora do recorte tributário.");
  const month = competence ?? p.competence;
  if (month < profile.startsAt || month > profile.endsAt)
    return unavailable(
      "Premissa fiscal fora da vigência. Revise explicitamente a estimativa.",
    );
  const value =
    profile.regime === "MEI"
      ? new D(0)
      : new D(base).times(profile.percent!).div(100);
  return {
    base,
    unrounded: value.toFixed(),
    amount: value.toFixed(2),
    coverage: "ESTIMATED",
    reasons:
      profile.regime === "MEI"
        ? [
            "Somente DAS fixo mensal: não rateado nem deduzido por venda; outras incidências não apuradas.",
          ]
        : ["Estimativa com alíquota informada; não é apuração fiscal."],
  };
}
