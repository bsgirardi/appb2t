import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { summarizeCommercial } from "@/domain/dashboard/commercial";
import { commercialAlerts } from "@/domain/dashboard/commercial-alerts";
import { replyWaitingSince } from "@/domain/opportunities/reply-tracking";
import { shiftDay } from "@/domain/dashboard/filters";
import {
  D,
  emptyPanel,
  metric,
  sum,
  dailySeries,
  statusChart,
  instantDay,
  civil,
  moneyText,
  numberText,
} from "./shared";

export async function getCommercialDashboard(
  _actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  return db.$transaction(
    async (tx) => {
      const [
        sales,
        quotes,
        requests,
        requirements,
        opportunities,
        commercialSettings,
      ] = await Promise.all([
        tx.sale.findMany({
          where: { status: { notIn: ["RASCUNHO", "CANCELADA"] } },
          select: {
            id: true,
            sequence: true,
            customerId: true,
            status: true,
            createdAt: true,
            expectedDeliveryDate: true,
            totals: true,
            items: {
              select: {
                productId: true,
                description: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        }),
        tx.quote.findMany({
          select: {
            id: true,
            sequence: true,
            opportunityId: true,
            version: true,
            status: true,
            createdAt: true,
            validUntil: true,
            totals: true,
            events: {
              where: { action: "APPROVE" },
              select: { createdAt: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
            sale: { select: { status: true } },
          },
        }),
        tx.catalogRequest.findMany({
          select: { id: true, sequence: true, state: true, createdAt: true },
        }),
        tx.artLineRequirement.findMany({
          where: { required: true, request: { state: { not: "ENCERRADA" } } },
          select: {
            id: true,
            requestId: true,
            request: { select: { sequence: true } },
            package: {
              select: {
                currentRevision: {
                  select: { state: true, publishedAt: true },
                },
              },
            },
          },
        }),
        tx.opportunity.findMany({
          where: { stage: { notIn: ["GANHO", "PERDIDO"] } },
          select: {
            id: true,
            title: true,
            stage: true,
            principalQuoteId: true,
            events: {
              where: {
                type: {
                  in: [
                    "PROPOSAL_SENT",
                    "CUSTOMER_REPLY",
                    "SET_PRIMARY",
                    "REOPEN",
                  ],
                },
              },
              select: { id: true, type: true, data: true, createdAt: true },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            },
            nextContactDate: true,
            nextAction: true,
            owner: { select: { name: true } },
          },
        }),
        tx.commercialSettings.findUnique({
          where: { id: 1 },
          select: { replyWaitDays: true },
        }),
      ]);
      const replyWaitDays = commercialSettings?.replyWaitDays ?? 14;
      const quoteVersions = new Map(quotes.map((q) => [q.id, q.version]));
      const alerts = commercialAlerts(
        quotes.map((q) => ({
          ...q,
          validUntil: q.validUntil ? civil(q.validUntil) : null,
        })),
        opportunities.map((o) => ({
          ...o,
          nextContactDate: o.nextContactDate ? civil(o.nextContactDate) : null,
          ownerName: o.owner?.name ?? null,
          waitingSince: o.principalQuoteId
            ? replyWaitingSince(
                (o.events ?? []).map((e) => ({
                  ...e,
                  createdAt: e.createdAt.toISOString(),
                })),
                o.principalQuoteId,
                quoteVersions.get(o.principalQuoteId) ?? 0,
              )
            : null,
        })),
        f.today,
        replyWaitDays,
      );
      const input = {
        sales: sales.map((s) => ({
          id: s.id,
          date: instantDay(s.createdAt),
          customerId: s.customerId,
          total: (s.totals as { total: string }).total,
          items: s.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            value: new D(i.unitPrice.toString()).times(i.quantity).toFixed(2),
          })),
        })),
        quotes: quotes.map((q) => ({
          id: q.id,
          date: instantDay(q.createdAt),
          converted:
            q.status === "CONVERTIDO" &&
            !!q.sale &&
            !["CANCELADA", "RASCUNHO"].includes(q.sale.status),
          approvedAt: q.events[0] ? instantDay(q.events[0].createdAt) : null,
        })),
        priorCustomers: sales
          .filter((s) => instantDay(s.createdAt) < f.from)
          .map((s) => s.customerId),
      };
      const stats = summarizeCommercial(input, f);
      const prev = summarizeCommercial(
        {
          ...input,
          priorCustomers: sales
            .filter((s) => instantDay(s.createdAt) < f.previousFrom)
            .map((s) => s.customerId),
        },
        { ...f, from: f.previousFrom, to: f.previousTo },
      );
      const activeQuotes = quotes.filter(
        (q) =>
          q.status === "RASCUNHO" ||
          (["ENVIADO", "APROVADO"].includes(q.status) &&
            q.validUntil &&
            civil(q.validUntil) >= f.today),
      );
      const pendingSales = sales.filter((s) => s.status !== "ENTREGUE");
      const waitingArts = requirements.filter(
        (r) => r.package?.currentRevision?.state !== "APPROVED",
      );
      const waitingApproval = waitingArts.filter(
        (r) => r.package?.currentRevision?.state === "AWAITING_CUSTOMER",
      );
      const waitingDays = waitingApproval.flatMap((r) =>
        r.package?.currentRevision?.publishedAt
          ? [
              Math.max(
                0,
                (Date.parse(f.today) -
                  Date.parse(
                    instantDay(r.package.currentRevision.publishedAt),
                  )) /
                  86400000,
              ),
            ]
          : [],
      );
      const panel = emptyPanel();
      panel.metrics = [
        metric(
          "sales",
          "Vendas no período",
          stats.salesValue,
          "money",
          "Vendas criadas no período, exceto rascunhos e canceladas.",
          {
            previous: prev.salesValue,
            href: `/vendas?status=realizadas&from=${f.from}&to=${f.to}`,
          },
        ),
        metric(
          "count",
          "Vendas realizadas",
          stats.salesCount,
          "number",
          "Quantidade de vendas criadas no período.",
          { previous: String(prev.salesCount) },
        ),
        metric(
          "ticket",
          "Ticket médio",
          stats.ticket,
          "money",
          "Valor vendido dividido pela quantidade de vendas.",
          {
            previous: prev.ticket,
            reason:
              stats.ticket === null ? "Nenhuma venda no período." : undefined,
          },
        ),
        metric(
          "conversion",
          "Conversão de orçamentos",
          stats.conversion,
          "percent",
          `${stats.conversionBase} orçamentos criados no período; convertidos em venda válida até hoje.`,
          {
            previous: prev.conversion,
            reason:
              stats.conversion === null
                ? "Nenhum orçamento na coorte."
                : undefined,
          },
        ),
        metric(
          "approval",
          "Tempo até aprovação",
          stats.approvalDays,
          "days",
          "Da criação até o primeiro evento de aprovação registrado.",
          {
            coverage: `${stats.approvalCoverage} com aprovação registrada`,
            reason:
              stats.approvalDays === null
                ? "Sem eventos de aprovação nesta coorte."
                : undefined,
          },
        ),
        metric(
          "recurring",
          "Clientes recorrentes",
          stats.recurringCustomers,
          "number",
          "Clientes com venda no período e outra venda válida anterior.",
        ),
        metric(
          "quotes",
          "Orçamentos em aberto",
          activeQuotes.length,
          "number",
          "Posição atual: rascunhos e propostas enviadas/aprovadas ainda válidas.",
          { href: "/orcamentos" },
        ),
        metric(
          "pipeline",
          "Valor em negociação",
          sum(
            activeQuotes
              .filter((q) => q.status !== "RASCUNHO")
              .map(
                (q) => (q.totals as { total?: string } | null)?.total ?? "0",
              ),
          ).toFixed(2),
          "money",
          "Propostas enviadas ou aprovadas ainda válidas; rascunhos excluídos.",
        ),
        metric(
          "expiring",
          "Propostas a vencer",
          alerts.expiringCount,
          "number",
          "Propostas vigentes avulsas ou principais de negociações abertas, de hoje até 7 dias à frente.",
        ),
        metric(
          "requests",
          "Solicitações recebidas",
          requests.filter(
            (r) =>
              instantDay(r.createdAt) >= f.from &&
              instantDay(r.createdAt) <= f.to,
          ).length,
          "number",
          "Solicitações criadas no período.",
          { href: "/solicitacoes" },
        ),
        metric(
          "pendingSales",
          "Pedidos aguardando entrega",
          pendingSales.length,
          "number",
          "Posição atual: vendas válidas ainda não entregues.",
          { href: "/vendas" },
        ),
        metric(
          "backlog",
          "Carteira em aberto",
          sum(
            pendingSales.map((s) => (s.totals as { total: string }).total),
          ).toFixed(2),
          "money",
          "Valor integral dos pedidos ainda não entregues; inclui entregas parciais.",
        ),
        metric(
          "arts",
          "Linhas aguardando arte",
          waitingArts.length - waitingApproval.length,
          "number",
          "Requisitos ativos sem revisão aprovada ou aguardando preparação/ajustes.",
        ),
        metric(
          "artApproval",
          "Linhas aguardando aprovação",
          waitingApproval.length,
          "number",
          "Requisitos com revisão atual aguardando o cliente.",
        ),
        metric(
          "artWait",
          "Espera de aprovação de arte",
          waitingDays.length
            ? sum(waitingDays).div(waitingDays.length).toFixed(2)
            : null,
          "days",
          "Média desde a publicação das revisões atualmente pendentes.",
          {
            coverage: `${waitingDays.length}/${waitingApproval.length} com data`,
            reason: !waitingDays.length
              ? "Nenhuma aprovação pendente com data de publicação."
              : undefined,
          },
        ),
      ];
      panel.charts = [
        statusChart(
          "saleStatus",
          "Vendas por situação",
          sales
            .filter(
              (s) =>
                instantDay(s.createdAt) >= f.from &&
                instantDay(s.createdAt) <= f.to,
            )
            .map((s) => s.status),
          "Vendas válidas criadas no período; situação atual.",
        ),
        dailySeries(
          "sales",
          "Evolução das vendas",
          input.sales
            .filter((s) => s.date >= f.from && s.date <= f.to)
            .map((s) => ({ date: s.date, value: s.total })),
          f,
        ),
        statusChart(
          "quotes",
          "Orçamentos por situação",
          quotes
            .filter(
              (q) =>
                instantDay(q.createdAt) >= f.from &&
                instantDay(q.createdAt) <= f.to,
            )
            .map((q) => q.status),
          "Orçamentos criados no período; situação atual.",
        ),
        statusChart(
          "requests",
          "Solicitações por situação",
          requests
            .filter(
              (r) =>
                instantDay(r.createdAt) >= f.from &&
                instantDay(r.createdAt) <= f.to,
            )
            .map((r) => r.state),
          "Solicitações criadas no período; situação atual.",
        ),
      ];
      panel.metrics.push(
        metric(
          "ready",
          "Vendas prontas para entrega",
          sales.filter((s) => s.status === "PRONTA").length,
          "number",
          "Posição atual: pedidos prontos aguardando entrega.",
          { href: "/vendas?status=PRONTA" },
        ),
      );
      panel.tables = [
        {
          id: "products",
          title: "Produtos mais vendidos",
          description:
            "Todos os itens das vendas no período. Valor bruto dos itens, antes de descontos e frete do pedido. Ordenado por valor.",
          columns: ["Produto", "Quantidade", "Valor bruto"],
          rows: stats.products.map((p) => ({
            id: p.id,
            cells: [p.name, numberText(p.quantity), moneyText(p.value)],
            href: p.id === "__none__" ? undefined : "/produtos",
          })),
        },
      ];
      panel.priorities = [
        ...alerts.priorities,
        ...pendingSales
          .filter(
            (s) =>
              s.expectedDeliveryDate &&
              civil(s.expectedDeliveryDate) <= shiftDay(f.today, 7),
          )
          .sort(
            (a, b) =>
              a.expectedDeliveryDate!.getTime() -
              b.expectedDeliveryDate!.getTime(),
          )
          .map((s) => ({
            id: s.id,
            title: `Venda #${s.sequence}`,
            detail: `Entrega ${civil(s.expectedDeliveryDate!)} · ${s.status.replaceAll("_", " ")}`,
            href: `/vendas/${s.id}`,
            severity:
              civil(s.expectedDeliveryDate!) < f.today
                ? ("urgent" as const)
                : ("attention" as const),
          })),
        ...waitingArts.map((r) => ({
          id: r.id,
          title: `Arte da solicitação #${r.request.sequence}`,
          detail:
            r.package?.currentRevision?.state === "AWAITING_CUSTOMER"
              ? "Aguardando aprovação do cliente"
              : "Arte precisa de preparação ou ajustes",
          href: `/solicitacoes/${r.requestId}`,
          severity: "attention" as const,
        })),
      ];
      panel.metrics.push(
        metric(
          "overdueContacts",
          "Contatos atrasados",
          alerts.overdueCount,
          "number",
          "Negociações abertas com contato agendado antes de hoje; posição atual.",
          { href: "/negociacoes?stage=abertas&due=atrasadas" },
        ),
      );
      panel.metrics.push(
        metric(
          "unanswered",
          "Sem retorno do cliente",
          alerts.unansweredCount,
          "number",
          `Propostas principais vigentes com envio explícito sem resposta registrada há pelo menos ${replyWaitDays} dias civis. Lembretes não reiniciam o prazo.`,
        ),
      );
      panel.priorityContext = [
        alerts.openRecords
          ? "Acompanhamento comercial da posição atual."
          : "Nenhuma negociação aberta ou proposta vigente registrada para acompanhamento comercial.",
        `${alerts.missingValidity} proposta(s) sem validade; ${alerts.missingContact} negociação(ões) sem data de próximo contato; ${alerts.missingPrincipal} negociação(ões) em proposta/negociação sem orçamento principal. Consulte Orçamentos e Negociações para completar os dados.`,
        `Ausência de alerta não comprova que todos os contatos estejam em dia. Sem retorno exige envio explícito da versão atual e ausência de resposta registrada por ${replyWaitDays} dias civis. Notas antigas não comprovam envio ou resposta. Lembretes não reiniciam o prazo.`,
      ].join(" ");
      panel.notes = [
        "As contagens de carteira, propostas e aprovações pendentes representam a posição atual, independentemente do período.",
        "As artes são contadas por linha requerida. A aplicabilidade final à configuração do pedido continua sendo validada no fluxo de produção.",
      ];
      return panel;
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
