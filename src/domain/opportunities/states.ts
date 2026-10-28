import { AppError } from "@/lib/errors";
import { openStages, type OpportunityStage } from "./types";
export function isOpportunityOpen(stage: OpportunityStage) {
  return (openStages as readonly string[]).includes(stage);
}
export function assertOpportunityTransition(
  from: OpportunityStage,
  to: OpportunityStage,
  hasPrincipal: boolean,
): void {
  if (
    !isOpportunityOpen(from) ||
    !isOpportunityOpen(to) ||
    (["PROPOSTA", "NEGOCIACAO"].includes(to) && !hasPrincipal)
  )
    throw new AppError(
      "CONFLICT",
      "Revise a etapa e o orçamento principal da oportunidade.",
    );
}
export function opportunityDueState(
  date: string | null,
  today: string,
): "atrasada" | "hoje" | "futura" | null {
  return date === null
    ? null
    : date < today
      ? "atrasada"
      : date === today
        ? "hoje"
        : "futura";
}
