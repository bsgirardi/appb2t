import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { summarizeStock } from "@/domain/dashboard/stock";
import { unprogrammedUnits } from "@/domain/dashboard/production";
import { outstandingCoverage } from "@/server/planning/coverage";
import {
  D,
  civil,
  emptyPanel,
  metric,
  sum,
  numberText,
  dateRange,
} from "./shared";

export async function getStockDashboard(
  _actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  return db.$transaction(
    async (tx) => {
      const [
        items,
        movements,
        reservations,
        participations,
        activity,
        activeLines,
      ] = await Promise.all([
        tx.stockItem.findMany({
          where: { active: true },
          select: { id: true, name: true, unit: true, inventoriedAt: true },
        }),
        tx.stockMovement.groupBy({
          by: ["itemId"],
          _sum: { quantity: true },
          _max: { effectiveDate: true },
        }),
        tx.stockReservationEvent.findMany({
          select: {
            kind: true,
            quantity: true,
            reservation: { select: { itemId: true } },
          },
        }),
        tx.planningParticipation.findMany({
          where: {
            batch: { state: { notIn: ["DRAFT", "CANCELED", "CLOSED"] } },
          },
          select: {
            id: true,
            batchId: true,
            units: true,
            settledUnits: true,
            releasedUnits: true,
            needQuantity: true,
            batch: { select: { materialItemId: true } },
            coverage: { select: { allocationId: true } },
          },
        }),
        tx.stockMovement.findMany({
          where: { effectiveDate: dateRange(f) },
          select: { itemId: true, quantity: true, effectiveDate: true },
        }),
        tx.productionLine.findMany({
          where: {
            order: { status: { in: ["LIBERADA", "EM_EXECUCAO"] } },
          },
          select: {
            targetUnits: true,
            events: { select: { goodUnits: true, canceledUnits: true } },
            planningParticipations: {
              select: {
                units: true,
                settledUnits: true,
                releasedUnits: true,
                batch: { select: { state: true } },
              },
            },
          },
        }),
      ]);
      // Reuse audited consumption/reconciliation rules for the allocations actually claimed by active lots.
      const coverage = (
        await Promise.all(
          [
            ...new Set(
              participations.flatMap((p) =>
                p.coverage.map((c) => c.allocationId),
              ),
            ),
          ].map((id) => outstandingCoverage(tx, id)),
        )
      ).flat();
      const input = items.map((i) => {
        const p = participations.filter((p) => p.batch.materialItemId === i.id);
        const need = sum(
          p.map((p) =>
            p.units
              ? new D(p.needQuantity.toString())
                  .times(
                    Math.max(0, p.units - p.settledUnits - p.releasedUnits),
                  )
                  .div(p.units)
                  .toFixed()
              : "0",
          ),
        ).toFixed();
        return {
          id: i.id,
          unit: i.unit,
          inventoried: !!i.inventoriedAt,
          physical:
            movements
              .find((m) => m.itemId === i.id)
              ?._sum.quantity?.toString() ?? "0",
          events: reservations
            .filter((e) => e.reservation.itemId === i.id)
            .map((e) => ({ kind: e.kind, quantity: e.quantity.toString() })),
          need,
          covered: sum(
            coverage
              .filter((c) => p.some((p) => p.batchId === c.batchId))
              .map((c) => c.quantity),
          ).toFixed(),
        };
      });
      const stats = summarizeStock(input),
        panel = emptyPanel();
      const shortages = stats.items.filter(
        (i) => i.purchase !== null && new D(i.purchase).gt(0),
      );
      panel.metrics = [
        metric(
          "items",
          "Materiais ativos",
          items.length,
          "number",
          "Itens ativos do estoque de materiais.",
          { href: "/estoque" },
        ),
        metric(
          "shortage",
          "Materiais a repor",
          shortages.length,
          "number",
          "Itens cuja necessidade declarada não está coberta por reservas e saldo livre.",
        ),
        metric(
          "unknown",
          "Sem inventário",
          items.filter((i) => !i.inventoriedAt).length,
          "number",
          "Sem inventário confirmado, saldo não é tratado como disponível.",
        ),
        metric(
          "undeclared",
          "Linhas com peças sem programação",
          activeLines.filter((l) => unprogrammedUnits(l) > 0).length,
          "number",
          "Linhas de ordens ativas com demanda restante sem lote, incluindo programação parcial. Esses materiais ainda não estão integralmente quantificados.",
          { href: "/planejamento" },
        ),
        metric(
          "activity",
          "Movimentações no período",
          activity.length,
          "number",
          "Entradas, saídas e correções com data efetiva no período.",
        ),
        metric(
          "idle",
          "Itens sem movimento no período",
          items.filter((i) => !activity.some((m) => m.itemId === i.id)).length,
          "number",
          "Inclui itens sem qualquer movimentação registrada.",
        ),
      ];
      panel.tables = [
        {
          id: "balance",
          title: "Posição dos materiais",
          description:
            "Saldos atuais, reservas vigentes e necessidade restante dos lotes ativos. Quantidades na unidade base do item.",
          columns: [
            "Material",
            "Unidade",
            "Físico",
            "Reservado",
            "Disponível",
            "Necessidade",
            "A repor",
          ],
          rows: stats.items.map((i) => ({
            id: i.id,
            cells: [
              items.find((x) => x.id === i.id)!.name,
              i.unit,
              i.physical === null ? "Sem inventário" : numberText(i.physical),
              numberText(i.reserved),
              i.available === null ? "Não informado" : numberText(i.available),
              numberText(i.need),
              i.purchase === null ? "Não informado" : numberText(i.purchase),
            ],
            href: `/estoque?query=${encodeURIComponent(items.find((x) => x.id === i.id)!.name)}`,
          })),
        },
        {
          id: "units",
          title: "Resumo por unidade",
          description:
            "Gramas, mililitros e unidades não são somados entre si.",
          columns: [
            "Unidade",
            "Físico",
            "Reservado",
            "Disponível",
            "Necessidade",
            "A repor",
          ],
          rows: stats.units.map((u) => ({
            id: u.unit,
            cells: [
              u.unit,
              ...[u.physical, u.reserved, u.available, u.need, u.purchase].map(
                (v) => (v === null ? "Dados insuficientes" : numberText(v)),
              ),
            ],
          })),
        },
        {
          id: "idle",
          title: "Tempo sem movimentação",
          description:
            "Ordenado pela movimentação efetiva mais antiga; itens sem histórico aparecem primeiro.",
          columns: ["Material", "Último movimento", "Dias sem movimento"],
          rows: [...items]
            .sort(
              (a, b) =>
                (movements
                  .find((m) => m.itemId === a.id)
                  ?._max.effectiveDate?.getTime() ?? 0) -
                (movements
                  .find((m) => m.itemId === b.id)
                  ?._max.effectiveDate?.getTime() ?? 0),
            )
            .map((i) => {
              const last = movements.find((m) => m.itemId === i.id)?._max
                .effectiveDate;
              return {
                id: i.id,
                cells: [
                  i.name,
                  last ? civil(last) : "Sem histórico",
                  last
                    ? String(
                        Math.max(
                          0,
                          Math.round(
                            (Date.parse(f.today) - Date.parse(civil(last))) /
                              86400000,
                          ),
                        ),
                      )
                    : "Não informado",
                ],
              };
            }),
        },
      ];
      panel.charts = stats.units.map((u) => ({
        id: `movement-${u.unit}`,
        title: `Movimentações · ${u.unit}`,
        description:
          "Entradas e saídas líquidas por dia; correções e devoluções mantêm o sinal registrado.",
        kind: "bar",
        unit: "number",
        keys: [
          { key: "incoming", label: `Entradas (${u.unit})` },
          { key: "outgoing", label: `Saídas (${u.unit})` },
        ],
        points: [
          ...new Set(
            activity
              .filter((m) =>
                items.some((i) => i.id === m.itemId && i.unit === u.unit),
              )
              .map((m) => civil(m.effectiveDate)),
          ),
        ]
          .sort()
          .map((date) => {
            const rows = activity.filter(
              (m) =>
                civil(m.effectiveDate) === date &&
                items.some((i) => i.id === m.itemId && i.unit === u.unit),
            );
            return {
              label: date,
              incoming: sum(
                rows
                  .filter((m) => m.quantity.gt(0))
                  .map((m) => m.quantity.toString()),
              ).toFixed(),
              outgoing: sum(
                rows
                  .filter((m) => m.quantity.lt(0))
                  .map((m) => m.quantity.abs().toString()),
              ).toFixed(),
            };
          }),
      }));
      panel.priorities = shortages.map((i) => ({
        id: i.id,
        title: items.find((x) => x.id === i.id)!.name,
        detail: `Repor ${numberText(i.purchase!)} ${i.unit} para a demanda declarada`,
        href: `/estoque?query=${encodeURIComponent(items.find((x) => x.id === i.id)!.name)}`,
        severity: "urgent",
      }));
      panel.notes = [
        "Reposição considera os lotes ativos com quantidade declarada e cobertura auditada; ordens sem declaração de material não têm consumo estimado inventado.",
        "Não há estoque mínimo presumido. A necessidade restante é proporcional às peças ainda não liquidadas/liberadas de cada participação.",
      ];
      return panel;
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
