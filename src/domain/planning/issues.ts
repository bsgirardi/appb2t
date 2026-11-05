import type { Forecast, PlanningInput } from "./types";

const definitions = {
  MACHINE_INACTIVE: [
    "Máquina inativa",
    "Revisar cadastro da impressora",
    "Máquina ativa e compatível.",
  ],
  MATERIAL_INACTIVE: [
    "Material não inventariado ou inativo",
    "Revisar material e inventário no estoque",
    "Material ativo e inventariado.",
  ],
  COLOR: [
    "Confirme a disponibilidade da cor manualmente",
    "Conferir a cor no detalhe do lote",
    "Disponibilidade da cor confirmada.",
  ],
  DURATION: [
    "Confirme o tempo do fatiador",
    "Revisar e confirmar duração no lote",
    "Duração positiva confirmada para a composição atual.",
  ],
  PROFILE_FIT: [
    "Confirme perfil e encaixe na mesa",
    "Revisar perfil e encaixe no lote",
    "Perfil e encaixe confirmados.",
  ],
  STOCK: [
    "Material insuficiente para as reservas existentes",
    "Revisar saldo e reservas no estoque",
    "Saldo disponível não negativo para as reservas.",
  ],
  ORDER_MACHINE: [
    "Revise a ordem ou máquina planejada",
    "Revisar liberação da OP e máquina da linha",
    "OP liberada/em execução e máquina/tecnologia compatíveis.",
  ],
  RESERVATION: [
    "Reserva insuficiente para o lote",
    "Revisar necessidade e cobertura no lote",
    "Necessidade positiva integralmente coberta por reservas.",
  ],
  COVERAGE_CHANGED: [
    "Reserva alterada; revise a cobertura",
    "Revisar cobertura no detalhe do lote",
    "Cobertura não excede a reserva restante.",
  ],
  CALENDAR: [
    "Calendário não configurado",
    "Configurar horários da equipe ou impressora",
    "Calendário da entidade configurado.",
  ],
  MISSING_DATA: [
    "Previsão indisponível por dados ou dependências incompletos",
    "Revisar bloqueios e calendários no planejamento",
    "Dados necessários e dependências com previsão disponível.",
  ],
  NO_WINDOW: [
    "Sem janela no horizonte",
    "Revisar duração e calendários no planejamento",
    "Janela contínua disponível no horizonte de 90 dias.",
  ],
  UNCONFIRMED_END: [
    "Término de serviço não confirmado",
    "Conferir marcos e tempo restante dos lotes ativos",
    "Marcos reais e duração restante atualizados.",
  ],
  MATERIAL_PENDING: [
    "Lote ainda não agendado",
    "Revisar material e confirmar agendamento no lote",
    "Lote agendado após resolver seus bloqueios.",
  ],
} as const;
export type IssueCode = keyof typeof definitions;
export type PlanningIssue = {
  code: string;
  message: string;
  entity: { kind: string; id: string };
  nextAction: string;
  resolution: string;
  target: { kind: string; id: string } | null;
};
export type BatchIssueFact = {
  code: string;
  kind: string;
  id: string;
  target?: { kind: string; id: string };
};
export function batchIssues(facts: BatchIssueFact[]): PlanningIssue[] {
  const unique = new Map<string, PlanningIssue>();
  for (const f of facts) {
    const definition = definitions[f.code as IssueCode];
    if (!definition) continue;
    const [message, nextAction, resolution] = definition;
    unique.set(`${f.code}:${f.kind}:${f.id}`, {
      code: f.code,
      message,
      nextAction,
      resolution,
      entity: { kind: f.kind, id: f.id },
      target: f.target ?? { kind: f.kind, id: f.id },
    });
  }
  return [...unique.values()];
}
export function forecastIssues(
  input: PlanningInput,
  projection: Forecast,
): PlanningIssue[] {
  return batchIssues([
    ...(!input.team
      ? [{ code: "CALENDAR", kind: "calendar", id: "TEAM" }]
      : []),
    ...input.machines
      .filter((m) => !m.calendar)
      .map((m) => ({
        code: "CALENDAR",
        kind: "calendar",
        id: `PRINTER:${m.id}`,
      })),
    ...projection.batches
      .filter((b) => b.reason)
      .map((b) => ({ code: b.reason!, kind: "batch", id: b.batchId })),
  ]);
}
