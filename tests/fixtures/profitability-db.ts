import { db } from "@/lib/db";
import { sale } from "./production";
export async function profitabilitySale(
  actorId: string,
  kind: "PRODUCTION" | "OPENING" = "PRODUCTION",
) {
  const s = await sale(undefined, 1);
  await db.sale.update({
    where: { id: s.id },
    data: {
      status: "ENTREGUE",
      totals: { subtotal: "200", discount: "0", shipping: "0", total: "200" },
    },
  });
  await db.saleItem.update({
    where: { id: s.items[0].id },
    data: { unitPrice: "200" },
  });
  await db.commerceEvent.create({
    data: {
      saleId: s.id,
      action: "CONFIRM",
      actorId,
      actorName: "Admin",
      createdAt: new Date("2026-10-09T12:00:00Z"),
    },
  });
  const stock = await db.finishedStock.create({
    data: { ownerSaleId: s.id, lineKey: "line1", inventoriedAt: new Date() },
  });
  let lineId: string | undefined;
  let eventId: string | undefined;
  if (kind === "PRODUCTION") {
    const o = await db.productionOrder.create({
      data: {
        origin: "SALE",
        saleId: s.id,
        status: "CONCLUIDA",
        lines: {
          create: {
            saleLineKey: "line1",
            description: "Peça",
            technology: "FDM",
            targetUnits: 1,
            events: {
              create: {
                kind: "REPORT",
                goodUnits: 1,
                materialComplete: true,
                timeComplete: true,
                machineMinutes: "60",
                setupMinutes: "60",
                finishingMinutes: "0",
                actorId,
                effectiveDate: new Date("2026-10-09"),
                premises: {
                  printer: {
                    watts: "0",
                    acquisitionCost: "1200",
                    amortizationMonths: 12,
                    daysPerMonth: 20,
                    hoursPerDay: "1",
                  },
                  settings: {
                    values: {
                      energyRate: "0",
                      maintenancePerHour: "0",
                      laborPerHour: "80",
                    },
                  },
                },
              },
            },
          },
        },
      },
      include: { lines: { include: { events: true } } },
    });
    lineId = o.lines[0].id;
    eventId = o.lines[0].events[0].id;
  }
  const origin = await db.finishedOrigin.create({
    data: {
      stockId: stock.id,
      kind,
      lineId,
      eventId,
      initialValue: kind === "OPENING" ? "85" : null,
      movements: {
        create: {
          kind: kind === "OPENING" ? "OPENING" : "PRODUCTION",
          units: 1,
          actorId,
          effectiveDate: new Date("2026-10-09"),
        },
      },
    },
  });
  const commitment = await db.finishedCommitment.create({
    data: { saleId: s.id, lineKey: "line1", originId: origin.id },
  });
  const movement = await db.finishedMovement.create({
    data: {
      originId: origin.id,
      kind: "DELIVERY",
      units: -1,
      actorId,
      effectiveDate: new Date("2026-10-09"),
    },
  });
  const delivery = await db.productionDelivery.create({
    data: {
      saleId: s.id,
      actorId,
      effectiveDate: new Date("2026-10-09"),
      lines: {
        create: {
          lineKey: "line1",
          commitmentId: commitment.id,
          units: 1,
          movementId: movement.id,
        },
      },
    },
    include: { lines: true },
  });
  return {
    saleId: s.id,
    lineId,
    eventId,
    originId: origin.id,
    deliveryLineId: delivery.lines[0].id,
  };
}
