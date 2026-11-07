import type { Priority } from "./types";
import { shiftDay } from "./filters";
import { openStages } from "@/domain/opportunities/types";
export type AlertQuote = {
  id: string;
  sequence: number;
  status: string;
  validUntil: string | null;
  opportunityId: string | null;
};
export type AlertOpportunity = {
  id: string;
  title: string;
  stage: string;
  principalQuoteId: string | null;
  nextContactDate: string | null;
  nextAction: string | null;
  ownerName: string | null;
};
const label = (date: string) => date.split("-").reverse().join("/");
const active = (q: AlertQuote) => ["ENVIADO", "APROVADO"].includes(q.status);
/** Current source projection only. A free-text interaction never proves a reply. */
export function commercialAlerts(
  quotes: AlertQuote[],
  opportunities: AlertOpportunity[],
  today: string,
) {
  const open = opportunities.filter((o) =>
    (openStages as readonly string[]).includes(o.stage),
  );
  const byOpportunity = new Map(open.map((o) => [o.id, o]));
  const current = quotes.filter(
    (q) =>
      !q.opportunityId ||
      byOpportunity.get(q.opportunityId)?.principalQuoteId === q.id,
  );
  const pending = current.filter(
    (q) => active(q) && (!q.validUntil || q.validUntil >= today),
  );
  const expiring = pending.filter(
    (q) => q.validUntil && q.validUntil <= shiftDay(today, 7),
  );
  const byPrincipal = new Map(expiring.map((q) => [q.id, q]));
  const rows: { deadline: string; priority: Priority }[] = [];
  for (const o of open) {
    const overdue = !!o.nextContactDate && o.nextContactDate < today;
    const q = o.principalQuoteId
      ? byPrincipal.get(o.principalQuoteId)
      : undefined;
    if (!overdue && !q) continue;
    const reasons = [
      ...(overdue
        ? [`Contato agendado atrasado desde ${label(o.nextContactDate!)}`]
        : []),
      ...(q
        ? [`Orçamento #${q.sequence} vence em ${label(q.validUntil!)}`]
        : []),
      `Responsável: ${o.ownerName || "não informado"}`,
      `Próxima ação: ${o.nextAction || "definir na negociação"}`,
    ];
    rows.push({
      deadline: overdue ? o.nextContactDate! : q!.validUntil!,
      priority: {
        id: `commercial:opportunity:${o.id}`,
        title: o.title,
        detail: reasons.join(" · "),
        href: `/negociacoes/${o.id}`,
        severity: overdue ? "urgent" : "attention",
      },
    });
  }
  for (const q of expiring.filter((q) => !q.opportunityId))
    rows.push({
      deadline: q.validUntil!,
      priority: {
        id: `commercial:quote:${q.id}`,
        title: `Orçamento #${q.sequence}`,
        detail: `Vence em ${label(q.validUntil!)} · Sem responsável vinculado · Próxima ação: revisar a proposta e combinar o contato`,
        href: `/orcamentos/${q.id}`,
        severity: "attention",
      },
    });
  rows.sort(
    (a, b) =>
      (a.priority.severity === "urgent" ? 0 : 1) -
        (b.priority.severity === "urgent" ? 0 : 1) ||
      a.deadline.localeCompare(b.deadline) ||
      a.priority.id.localeCompare(b.priority.id),
  );
  return {
    priorities: rows.map((r) => r.priority),
    expiringCount: expiring.length,
    overdueCount: open.filter(
      (o) => o.nextContactDate && o.nextContactDate < today,
    ).length,
    missingValidity: pending.filter((q) => !q.validUntil).length,
    missingContact: open.filter((o) => !o.nextContactDate).length,
    missingPrincipal: open.filter(
      (o) =>
        ["PROPOSTA", "NEGOCIACAO"].includes(o.stage) && !o.principalQuoteId,
    ).length,
    openRecords: open.length + pending.filter((q) => !q.opportunityId).length,
  };
}
