import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
// Only exclusive, explicit report links can attribute consumption to a lot.
// Shared reports remain outstanding until an audited physical reconciliation.
export async function outstandingCoverage(
  tx: Prisma.TransactionClient,
  allocationId: string,
) {
  const allocation = await tx.productionReservationAllocation.findUniqueOrThrow(
    { where: { id: allocationId } },
  );
  const rows = await tx.planningMaterialCoverage.findMany({
    where: {
      allocationId,
      participation: { batch: { state: { notIn: ["DRAFT", "CANCELED"] } } },
    },
    include: {
      participation: {
        include: {
          reports: {
            include: {
              event: {
                include: {
                  planningReports: true,
                  materialLinks: true,
                  corrections: { include: { materialLinks: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  return Promise.all(
    rows.map(async (c) => {
      let consumed = new Decimal(0);
      for (const report of c.participation.reports) {
        const event = report.event;
        if (event.planningReports.length !== 1) continue;
        for (const link of event.materialLinks) {
          const reservation = await tx.stockReservationEvent.findFirst({
            where: {
              reservationId: allocation.reservationId,
              kind: "CONSUME",
              movementId: link.movementId,
            },
          });
          if (!reservation) continue;
          const returned = await tx.stockMovement.aggregate({
            where: { sourceId: link.movementId, kind: "RETURN_CONSUMPTION" },
            _sum: { quantity: true },
          });
          const net = new Decimal(link.quantity.toString()).plus(
            event.corrections
              .flatMap((e) => e.materialLinks)
              .filter((l) => l.movementId === link.movementId)
              .reduce((n, l) => n.plus(l.quantity.toString()), new Decimal(0)),
          );
          consumed = consumed.plus(
            Decimal.max(
              0,
              Decimal.min(
                net,
                new Decimal(reservation.quantity.toString()).minus(
                  returned._sum.quantity?.toString() ?? 0,
                ),
              ),
            ),
          );
        }
      }
      return {
        id: c.id,
        batchId: c.participation.batchId,
        quantity: Decimal.max(
          0,
          new Decimal(c.quantity.toString())
            .minus(c.releasedQuantity.toString())
            .minus(consumed),
        ).toFixed(),
      };
    }),
  );
}
export async function coveredTotal(
  tx: Prisma.TransactionClient,
  allocationId: string,
) {
  return (await outstandingCoverage(tx, allocationId)).reduce(
    (n, c) => n.plus(c.quantity),
    new Decimal(0),
  );
}
