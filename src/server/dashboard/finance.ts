import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdmin } from "@/server/auth/authorization";
import type { Actor } from "@/server/auth/session";
import { financeFilterSchema } from "@/domain/finance/validation";
import { entrySelectionSql } from "@/server/finance/entries";
import { getAccountBalance } from "@/server/finance/accounts";
import { summarizeFinance } from "@/domain/dashboard/financial";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { shiftDay } from "@/domain/dashboard/filters";
import {
  D,
  sum,
  civil,
  emptyPanel,
  metric,
  dateRange,
  moneyText,
} from "./shared";
type EntryRow = {
  id: string;
  dueDate: Date;
  kind: "RECEIVABLE" | "PAYABLE";
  amount: Prisma.Decimal;
  paid: Prisma.Decimal;
  canceledAt: Date | null;
};
export async function getFinancialDashboard(
  actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      const [accounts, entries, movements] = await Promise.all([
        tx.financialAccount.findMany({ select: { id: true, name: true } }),
        tx.$queryRaw<EntryRow[]>(
          entrySelectionSql(financeFilterSchema.parse({})),
        ),
        tx.cashMovement.findMany({
          where: {
            effectiveDate: dateRange({ from: f.previousFrom, to: f.to }),
          },
          select: {
            amount: true,
            kind: true,
            effectiveDate: true,
            reversalOf: { select: { kind: true } },
          },
        }),
      ]);
      const balances = await Promise.all(
        accounts.map((a) => getAccountBalance(tx, a.id, f.today)),
      );
      const balance =
        !accounts.length || balances.some((b) => b === null)
          ? null
          : sum(balances as string[]).toFixed(2);
      const pending = entries
        .filter((e) => !e.canceledAt)
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          due: civil(e.dueDate),
          remaining: new D(e.amount.toString())
            .minus(e.paid.toString())
            .toFixed(2),
        }));
      const stats = summarizeFinance(pending, balance, f.today);
      const net = (from: string, to: string, kind: string) =>
        sum(
          movements
            .filter(
              (m) =>
                civil(m.effectiveDate) >= from &&
                civil(m.effectiveDate) <= to &&
                (m.kind === "REVERSAL" ? m.reversalOf?.kind : m.kind) === kind,
            )
            .map((m) =>
              kind === "PAYMENT"
                ? m.amount.negated().toString()
                : m.amount.toString(),
            ),
        ).toFixed(2);
      const panel = emptyPanel();
      panel.metrics = [
        metric(
          "balance",
          "Saldo atual",
          balance,
          "money",
          "Posição das contas até hoje; inclui contas inativas com saldo.",
          {
            href: "/financeiro/contas",
            reason:
              balance === null
                ? "Há contas sem posição conhecida ou nenhuma conta cadastrada."
                : undefined,
          },
        ),
        metric(
          "receivable",
          "A receber",
          stats.receivable,
          "money",
          "Saldo pendente atual após baixas e estornos.",
          { href: "/financeiro/lancamentos?kind=RECEIVABLE" },
        ),
        metric(
          "payable",
          "A pagar",
          stats.payable,
          "money",
          "Compromissos pendentes atuais.",
          { href: "/financeiro/lancamentos?kind=PAYABLE" },
        ),
        metric(
          "overdueIn",
          "Recebíveis vencidos",
          stats.overdueReceivable,
          "money",
          "Recebíveis pendentes com vencimento anterior a hoje.",
          { href: "/financeiro/lancamentos?kind=RECEIVABLE&overdue=true" },
        ),
        metric(
          "overdueOut",
          "Pagamentos vencidos",
          stats.overduePayable,
          "money",
          "Pagamentos pendentes com vencimento anterior a hoje.",
        ),
        metric(
          "incoming",
          "Entradas realizadas",
          net(f.from, f.to, "RECEIPT"),
          "money",
          "Recebimentos líquidos de estornos no período; não inclui transferências.",
          { previous: net(f.previousFrom, f.previousTo, "RECEIPT") },
        ),
        metric(
          "outgoing",
          "Saídas realizadas",
          net(f.from, f.to, "PAYMENT"),
          "money",
          "Pagamentos líquidos de estornos no período; não inclui transferências.",
          { previous: net(f.previousFrom, f.previousTo, "PAYMENT") },
        ),
        metric(
          "in7",
          "A receber em 7 dias",
          stats.receivable7,
          "money",
          "De hoje até 7 dias à frente, sem vencidos.",
        ),
        metric(
          "out7",
          "A pagar em 7 dias",
          stats.payable7,
          "money",
          "De hoje até 7 dias à frente, sem vencidos.",
        ),
        metric(
          "in30",
          "A receber em 30 dias",
          stats.receivable30,
          "money",
          "De hoje até 30 dias à frente, sem vencidos.",
        ),
        metric(
          "out30",
          "A pagar em 30 dias",
          stats.payable30,
          "money",
          "De hoje até 30 dias à frente, sem vencidos.",
        ),
        metric(
          "delinquency",
          "Inadimplência da carteira",
          stats.delinquency,
          "percent",
          "Saldo vencido / saldo total dos recebíveis pendentes.",
          {
            reason:
              stats.delinquency === null
                ? "Não há recebíveis pendentes."
                : undefined,
          },
        ),
        metric(
          "minimum",
          "Menor saldo projetado",
          stats.minimum,
          "money",
          "Menor posição nos próximos 30 dias, considerando vencidos como previstos hoje.",
          {
            reason:
              balance === null
                ? "Saldo inicial desconhecido impede a projeção."
                : undefined,
          },
        ),
        metric(
          "cashNeed",
          "Necessidade de caixa",
          stats.minimum === null
            ? null
            : D.max(0, new D(stats.minimum).negated()).toFixed(2),
          "money",
          "Valor para cobrir o menor saldo negativo projetado no horizonte.",
          {
            reason:
              balance === null ? "Saldo inicial desconhecido." : undefined,
          },
        ),
      ];
      panel.charts = [
        {
          id: "cash",
          title: "Entradas e saídas realizadas",
          description:
            "Movimentações com data efetiva no período, líquidas de estornos.",
          kind: "bar",
          unit: "money",
          keys: [
            { key: "incoming", label: "Entradas" },
            { key: "outgoing", label: "Saídas" },
          ],
          points: [
            ...new Set(
              movements
                .filter((m) => civil(m.effectiveDate) >= f.from)
                .map((m) => civil(m.effectiveDate)),
            ),
          ]
            .sort()
            .map((date) => ({
              label: date,
              incoming: net(date, date, "RECEIPT"),
              outgoing: net(date, date, "PAYMENT"),
            })),
        },
        {
          id: "projection",
          title: "Projeção de caixa · 30 dias",
          description:
            "Estimativa a partir dos saldos e vencimentos atuais. Vencidos entram hoje; não é garantia de recebimento.",
          kind: "area",
          unit: "money",
          keys: [{ key: "value", label: "Saldo projetado" }],
          points: stats.projected.map((d) => ({
            label: d.date,
            value: d.closingBalance,
          })),
        },
      ];
      panel.tables = [
        {
          id: "accounts",
          title: "Posição por conta",
          description:
            "Saldo até hoje. Contas com abertura futura permanecem sem posição conhecida.",
          columns: ["Conta", "Saldo"],
          rows: accounts.map((a, i) => ({
            id: a.id,
            cells: [
              a.name,
              balances[i] === null ? "Não informado" : moneyText(balances[i]!),
            ],
            href: "/financeiro/contas",
          })),
        },
      ];
      panel.priorities = pending
        .filter(
          (e) => new D(e.remaining).gt(0) && e.due <= shiftDay(f.today, 7),
        )
        .sort((a, b) => a.due.localeCompare(b.due))
        .map((e) => ({
          id: e.id,
          title:
            e.kind === "RECEIVABLE"
              ? "Recebimento pendente"
              : "Pagamento pendente",
          detail: `${moneyText(e.remaining)} · vencimento ${e.due}`,
          href: `/financeiro/lancamentos?kind=${e.kind}${e.due < f.today ? "&overdue=true" : ""}`,
          severity: e.due < f.today ? "urgent" : "attention",
        }));
      panel.notes = [
        "Saldos e pendências representam a posição atual; entradas e saídas usam o período selecionado.",
        "Projeção reaproveita o cálculo financeiro existente e inclui obrigações vencidas no saldo previsto de hoje.",
      ];
      return panel;
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
