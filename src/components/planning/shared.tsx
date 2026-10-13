"use client";
import type { getPlanning } from "@/server/planning/queries";
import type { BatchDTO } from "@/domain/planning/types";
export {
  ActionForm,
  Toggle,
  text,
  decimal,
  count,
  optional,
} from "@/components/production/shared";
export { Select } from "@/components/finance/shared";
export type PlanningData = Awaited<ReturnType<typeof getPlanning>>;
export const states: Record<BatchDTO["state"], string> = {
  DRAFT: "Rascunho",
  PENDING: "Pendente",
  SCHEDULED: "Programado",
  PREPARING: "Em preparação",
  PRINTING: "Imprimindo",
  AWAITING_REMOVAL: "Aguardando retirada",
  CLOSED: "Encerrado",
  CANCELED: "Cancelado",
};
export const markers: Record<string, string> = {
  PREPARE_START: "Iniciar preparação",
  PRINT_START: "Iniciar impressão",
  PRINT_END: "Confirmar fim da impressão",
  REMOVE_START: "Iniciar retirada",
  REMOVE_END: "Concluir retirada",
  INTERRUPT: "Registrar interrupção",
  REMAINING: "Atualizar tempo restante",
};
export const instantLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
export const meta = (
  data: PlanningData,
  operationKey: string,
  version = 0,
) => ({
  operationKey,
  expectedRevision: data.revision,
  expectedVersion: version,
});
