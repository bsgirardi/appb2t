import type { CheckoutOfferPolicy } from "./types";
import { readCheckoutPolicy } from "./validation";
export function resolveCheckoutEligibility(
  rows: { policy: unknown; active: boolean; consult: boolean }[],
): {
  deliveryModes: CheckoutOfferPolicy["deliveryModes"];
  route: "DIRECT" | "REVIEW";
  blocked: boolean;
  reasons: string[];
} {
  const policies = rows.map((r) => readCheckoutPolicy(r.policy));
  const deliveryModes = (["PICKUP", "TEAM_SHIPPING"] as const).filter((m) =>
    policies.every((p) => p.deliveryModes.includes(m)),
  );
  const reasons: string[] = [];
  if (rows.some((r) => !r.active))
    reasons.push("Há item indisponível na seleção.");
  if (rows.some((r, i) => r.consult || !policies[i].directEnabled))
    reasons.push("A seleção precisa de conferência da equipe.");
  if (!deliveryModes.length)
    reasons.push(
      "Não há modalidade comum. Separe os itens em pedidos diferentes.",
    );
  return {
    deliveryModes,
    route: reasons.length ? "REVIEW" : "DIRECT",
    blocked:
      !rows.length || rows.some((r) => !r.active) || !deliveryModes.length,
    reasons,
  };
}
