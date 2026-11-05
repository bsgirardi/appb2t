import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import {
  demandIssue,
  type DemandFacts,
} from "@/domain/planning/commercial-types";
export async function loadSaleDemand(
  tx: Prisma.TransactionClient,
  saleId: string,
): Promise<DemandFacts> {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: {
      items: true,
      productionOrders: {
        include: {
          lines: {
            include: {
              events: true,
              origins: {
                include: {
                  movements: true,
                  commitments: { include: { events: true } },
                  stock: true,
                },
              },
            },
          },
        },
      },
      productionDeliveries: { include: { lines: true } },
      finishedCommitments: {
        include: {
          events: true,
          origin: {
            include: {
              movements: true,
              commitments: { include: { events: true } },
              stock: true,
            },
          },
        },
      },
    },
  });
  if (!sale) throw new AppError("NOT_FOUND", "Venda não encontrada.");
  const issue = (code: string, message: string) =>
    demandIssue(
      code,
      sale.id,
      message,
      "Revisar vínculos no detalhe da venda e produção",
    );
  const issues = [];
  const keys = sale.items.map((l) => l.lineKey).filter(Boolean);
  if (keys.length !== sale.items.length || new Set(keys).size !== keys.length)
    issues.push(issue("LINE_KEY", "Itens sem chave comercial única."));
  const prod = sale.productionOrders
    .filter((o) => !["RASCUNHO", "CANCELADA"].includes(o.status))
    .flatMap((o) => o.lines);
  if (prod.some((p) => !p.saleLineKey || !keys.includes(p.saleLineKey)))
    issues.push(
      issue("ORPHAN_LINE", "Linha produtiva sem correspondência comercial."),
    );
  return {
    saleId,
    mode: sale.fulfillmentMode,
    status: sale.status,
    issues,
    lines: sale.items.map((l) => {
      const cs = sale.finishedCommitments.filter(
        (c) => c.lineKey === l.lineKey,
      );
      const local = [];
      let committedUnits = 0;
      for (const c of cs) {
        const n = c.events.reduce((s, e) => s + e.units, 0);
        // Closed commitments are historical facts; current stock availability
        // only constrains quantities still committed to this order.
        if (n === 0) continue;
        const physical = c.origin.movements.reduce((s, m) => s + m.units, 0);
        const total = c.origin.commitments
          .flatMap((c) => c.events)
          .reduce((s, e) => s + e.units, 0);
        if (
          n < 0 ||
          total > physical ||
          !c.origin.stock.active ||
          !c.origin.stock.inventoriedAt
        ) {
          local.push(
            issue(
              "COMMITMENT_INVALID",
              "Compromisso com origem indisponível ou saldo inconsistente.",
            ),
          );
          continue;
        }
        committedUnits += n;
      }
      const ps = prod.filter((p) => p.saleLineKey === l.lineKey);
      const uncommittedGoodUnits = ps
        .flatMap((p) => p.origins)
        .reduce(
          (s, o) =>
            s +
            Math.max(
              0,
              o.movements.reduce((n, m) => n + m.units, 0) -
                o.commitments
                  .flatMap((c) => c.events)
                  .reduce((n, e) => n + e.units, 0),
            ),
          0,
        );
      return {
        lineKey: l.lineKey ?? "",
        description: l.description,
        soldUnits: l.quantity,
        deliveredUnits: sale.productionDeliveries
          .flatMap((d) => d.lines)
          .filter((d) => d.lineKey === l.lineKey)
          .reduce((s, d) => s + d.units, 0),
        committedUnits,
        uncommittedGoodUnits,
        issues: local,
        production: ps.map((p) => ({
          lineId: p.id,
          remaining:
            p.targetUnits -
            p.events.reduce((s, e) => s + e.goodUnits + e.canceledUnits, 0),
        })),
      };
    }),
  };
}
