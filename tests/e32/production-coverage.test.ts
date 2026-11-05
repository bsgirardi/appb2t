import { it, expect } from "vitest";
import { setupDatabase, fixture, snapshot } from "./setup";
import { db } from "@/lib/db";
import { getSaleForecast } from "@/server/planning/commercial-read";
import { previewCommercial } from "@/server/planning/commercial-preview";
setupDatabase();
it("keeps an entirely delivered sale complete after its unreserved finished stock is disabled", async () => {
  const f = await fixture(),
    date = new Date("2026-11-04");
  const sale = await db.sale.create({
    data: {
      customerId: f.customer.id,
      status: "ENTREGUE",
      fulfillmentMode: "U3",
      document: {},
      totals: {},
      items: {
        create: {
          lineKey: "x",
          position: 0,
          description: "Peça entregue",
          quantity: 1,
          unitPrice: "10",
        },
      },
    },
  });
  const stock = await db.finishedStock.create({
    data: {
      ownerSaleId: sale.id,
      lineKey: "x",
      inventoriedAt: date,
      active: false,
    },
  });
  const origin = await db.finishedOrigin.create({
    data: {
      stockId: stock.id,
      kind: "OPENING",
      movements: {
        create: {
          kind: "OPENING",
          units: 1,
          actorId: f.actor.id,
          effectiveDate: date,
        },
      },
    },
  });
  const commitment = await db.finishedCommitment.create({
    data: {
      saleId: sale.id,
      lineKey: "x",
      originId: origin.id,
      events: {
        create: [
          { kind: "RESERVE", units: 1, actorId: f.actor.id },
          { kind: "DELIVER", units: -1, actorId: f.actor.id },
        ],
      },
    },
  });
  const move = await db.finishedMovement.create({
    data: {
      originId: origin.id,
      kind: "DELIVERY",
      units: -1,
      actorId: f.actor.id,
      effectiveDate: date,
    },
  });
  await db.productionDelivery.create({
    data: {
      saleId: sale.id,
      actorId: f.actor.id,
      effectiveDate: date,
      lines: {
        create: {
          lineKey: "x",
          commitmentId: commitment.id,
          units: 1,
          movementId: move.id,
        },
      },
    },
  });
  const before = await snapshot(),
    r = await getSaleForecast(f.actor, sale.id, {});
  expect(r.result.demand.allDelivered).toBe(true);
  expect(r.result.demand.completeCoverage).toBe(true);
  expect(r.result.demand.lines[0].issues).toEqual([]);
  expect(await snapshot()).toEqual(before);
});
it("does not reuse produced and committed goods as new pending coverage, including corrections", async () => {
  const f = await fixture();
  const date = new Date("2026-11-04");
  const sale = await db.sale.create({
    data: {
      customerId: f.customer.id,
      status: "CONFIRMADA",
      fulfillmentMode: "U3",
      document: {},
      totals: {},
      items: {
        create: {
          lineKey: "x",
          position: 0,
          description: "Peça",
          quantity: 10,
          unitPrice: "10",
        },
      },
    },
  });
  const order = await db.productionOrder.create({
    data: {
      origin: "SALE",
      saleId: sale.id,
      status: "EM_EXECUCAO",
      lines: {
        create: {
          saleLineKey: "x",
          description: "Peça",
          technology: "FDM",
          targetUnits: 10,
        },
      },
    },
    include: { lines: true },
  });
  const l = order.lines[0];
  const report = await db.productionEvent.create({
    data: {
      lineId: l.id,
      kind: "REPORT",
      goodUnits: 6,
      actorId: f.actor.id,
      effectiveDate: date,
    },
  });
  await db.productionEvent.create({
    data: {
      lineId: l.id,
      kind: "CORRECTION",
      sourceId: report.id,
      goodUnits: -1,
      actorId: f.actor.id,
      effectiveDate: date,
    },
  });
  const stock = await db.finishedStock.create({
    data: { ownerSaleId: sale.id, lineKey: "x", inventoriedAt: date },
  });
  const origin = await db.finishedOrigin.create({
    data: {
      stockId: stock.id,
      lineId: l.id,
      eventId: report.id,
      kind: "PRODUCTION",
      movements: {
        create: [
          {
            kind: "PRODUCTION",
            units: 6,
            actorId: f.actor.id,
            effectiveDate: date,
          },
          {
            kind: "CORRECTION",
            units: -1,
            actorId: f.actor.id,
            effectiveDate: date,
          },
        ],
      },
    },
  });
  await db.finishedCommitment.create({
    data: {
      saleId: sale.id,
      lineKey: "x",
      originId: origin.id,
      events: { create: { kind: "RESERVE", units: 3, actorId: f.actor.id } },
    },
  });
  const before = await snapshot(),
    r = await getSaleForecast(f.actor, sale.id, {});
  expect(r.result.demand.lines[0]).toMatchObject({
    readyCommitted: 3,
    planned: 0,
    uncovered: 7,
  });
  expect(
    r.result.demand.lines[0].issues.some((i) => i.code === "UNASSIGNED_GOOD"),
  ).toBe(true);
  expect(r.result.demand.removalAt).toBeNull();
  expect(await snapshot()).toEqual(before);
});
it("simulates manually declared FDM against real calendars without creating productive confirmations", async () => {
  const f = await fixture();
  const printer = await db.printer.create({
    data: {
      name: "Impressora sintética",
      technology: "FDM",
      acquisitionCost: "1000",
      amortizationMonths: 24,
      daysPerMonth: 20,
      hoursPerDay: "8",
      watts: "100",
    },
  });
  const weekly = Array.from({ length: 7 }, (_, i) => ({
    weekday: i + 1,
    startMinute: 0,
    endMinute: 1440,
  }));
  await db.planningCalendar.createMany({
    data: [
      { id: "TEAM", resource: "TEAM", weekly, exceptions: [] },
      {
        id: `PRINTER:${printer.id}`,
        resource: "PRINTER",
        printerId: printer.id,
        weekly,
        exceptions: [],
      },
    ],
  });
  const material = await db.stockItem.create({
    data: {
      name: "Filamento sintético",
      unit: "G",
      method: "MANUAL",
      manualUnitCost: "1",
      inventoriedAt: new Date(),
    },
  });
  await db.stockMovement.create({
    data: {
      itemId: material.id,
      kind: "OPENING",
      quantity: "1000",
      method: "MANUAL",
      manualUnitCost: "1",
      confirmedValue: "1000",
      actorId: f.actor.id,
      effectiveDate: new Date(),
    },
  });
  const affectedSale = await db.sale.create({
    data: {
      customerId: f.customer.id,
      status: "CONFIRMADA",
      fulfillmentMode: "U3",
      document: {},
      totals: {},
      items: {
        create: {
          lineKey: "real-line",
          position: 0,
          description: "Demanda existente",
          quantity: 4,
          unitPrice: "10",
        },
      },
    },
  });
  const affectedOrder = await db.productionOrder.create({
    data: {
      origin: "SALE",
      saleId: affectedSale.id,
      status: "LIBERADA",
      lines: {
        create: {
          saleLineKey: "real-line",
          description: "Demanda existente",
          technology: "FDM",
          plannedPrinterId: printer.id,
          targetUnits: 4,
        },
      },
    },
    include: { lines: true },
  });
  const reservation = await db.stockReservation.create({
    data: {
      itemId: material.id,
      saleId: affectedSale.id,
      lineKey: "real-line",
      events: {
        create: { kind: "RESERVE", quantity: "40", actorId: f.actor.id },
      },
    },
  });
  const allocation = await db.productionReservationAllocation.create({
    data: {
      lineId: affectedOrder.lines[0].id,
      reservationId: reservation.id,
      events: {
        create: { kind: "RESERVE", quantity: "40", actorId: f.actor.id },
      },
    },
  });
  const realBatch = await db.planningBatch.create({
    data: {
      printerId: printer.id,
      materialItemId: material.id,
      state: "SCHEDULED",
      position: 1,
      colorKey: "azul",
      colorLabel: "Azul",
      durationMinutes: "60",
      durationConfirmedAt: new Date(),
      profileConfirmed: true,
      fitConfirmed: true,
      colorAvailabilityConfirmed: true,
      prepareMinutes: "10",
      removeMinutes: "5",
      participants: {
        create: {
          lineId: affectedOrder.lines[0].id,
          units: 4,
          needQuantity: "40",
          coverage: { create: { allocationId: allocation.id, quantity: "40" } },
        },
      },
    },
  });
  const existingForecast = await getSaleForecast(f.actor, affectedSale.id, {});
  expect(existingForecast.result.demand.completeCoverage).toBe(true);
  expect(existingForecast.result.demand.removalAt).not.toBeNull();
  const before = await snapshot();
  const r = await previewCommercial(f.actor, f.o.id, {
    quoteId: f.q.id,
    quoteVersion: 1,
    opportunityVersion: 1,
    scenario: {
      lines: [
        {
          lineKey: "x",
          quantity: 2,
          mode: "produce",
          batches: [
            {
              id: "hyp",
              lineKey: "x",
              technology: "FDM",
              printerId: printer.id,
              units: 2,
              durationMinutes: "60",
              prepareMinutes: "10",
              removeMinutes: "10",
              materialItemId: material.id,
              colorLabel: "Azul",
              availableAt: new Date(Date.now() + 86400000).toISOString(),
              availabilityReason: "Saldo conferido como hipótese",
              durationSource: "manual",
              reviewed: true,
              profileAssumed: true,
              fitAssumed: true,
            },
          ],
        },
      ],
      completion: { post: { mode: "unknown" }, delivery: { mode: "unknown" } },
    },
  });
  expect(r.result.removalAt).not.toBeNull();
  expect(
    r.result.impacts.find((i) => i.batchId === realBatch.id)?.sales,
  ).toEqual([{ id: affectedSale.id, sequence: affectedSale.sequence }]);
  expect(
    r.result.impacts.find((i) => i.batchId === realBatch.id)?.participants[0]
      .orderSequence,
  ).toBe(affectedOrder.sequence);
  expect(r.result.completion.deliveryAt).toBeNull();
  expect(await snapshot()).toEqual(before);
});
