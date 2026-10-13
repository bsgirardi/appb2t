import { db } from "@/lib/db";
import { meta, sale, date } from "./production";
import { seedUser } from "../integration/setup";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { reserveOrderMaterial } from "@/server/production/reservations";
import {
  saveBatch,
  confirmBatch,
  scheduleBatch,
} from "@/server/planning/batches";
import { setBatchCoverage } from "@/server/planning/materials";
import { saveCalendar } from "@/server/planning/calendars";
export async function planningFixture() {
  const actor = await seedUser();
  const printer = await db.printer.create({
    data: {
      name: "Máquina A",
      technology: "FDM",
      acquisitionCost: "1000",
      amortizationMonths: 12,
      daysPerMonth: 20,
      hoursPerDay: "8",
      watts: "100",
    },
  });
  const s = await sale();
  const material = await saveStockItem(actor, {
    ...meta(),
    name: "PLA azul",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
  });
  await openInventory(actor, {
    ...meta(material.version),
    itemId: material.id,
    quantity: "1000",
    value: "100",
    effectiveDate: date(),
  });
  const draft = await saveOrder(actor, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    dueDate: date(),
    responsibleId: actor.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Peça azul",
        technology: "FDM",
        targetUnits: 10,
        plannedPrinterId: printer.id,
      },
    ],
  });
  let order = await releaseOrder(actor, {
    ...meta(draft.version),
    orderId: draft.id,
  });
  order = await reserveOrderMaterial(actor, {
    ...meta(order.version),
    lineId: order.lines[0].id,
    itemId: material.id,
    quantity: "100",
    effectiveDate: date(),
  });
  const allocation = await db.productionReservationAllocation.findFirstOrThrow({
    where: { lineId: order.lines[0].id },
  });
  return { actor, printer, material, order, allocation, sale: s };
}
export async function planningMeta(expectedVersion = 0) {
  const state = await db.planningState.findUnique({ where: { id: 1 } });
  return { ...meta(expectedVersion), expectedRevision: state?.revision ?? 0 };
}
export async function scheduledBatch(
  f: Awaited<ReturnType<typeof planningFixture>>,
  units = 5,
) {
  for (const resource of ["TEAM", "PRINTER"] as const) {
    const id = resource === "TEAM" ? "TEAM" : `PRINTER:${f.printer.id}`;
    if (!(await db.planningCalendar.findUnique({ where: { id } })))
      await saveCalendar(f.actor, {
        ...(await planningMeta()),
        resource,
        printerId: resource === "TEAM" ? null : f.printer.id,
        weekly: Array.from({ length: 7 }, (_, i) => ({
          weekday: i + 1,
          startMinute: 0,
          endMinute: 1440,
        })),
        exceptions: [],
      });
  }
  let b = await saveBatch(f.actor, {
    ...(await planningMeta()),
    printerId: f.printer.id,
    participants: [{ lineId: f.order.lines[0].id, units }],
    materialItemId: f.material.id,
    colorLabel: "Azul",
    profileConfirmed: true,
    fitConfirmed: true,
    durationMinutes: "60",
    durationConfirmed: true,
    prepareMinutes: "5",
    removeMinutes: "10",
  });
  b = await confirmBatch(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
  });
  b = await setBatchCoverage(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
    colorAvailabilityConfirmed: true,
    needs: [
      { participationId: b.participants[0].id, quantity: String(units * 10) },
    ],
    allocations: [
      {
        participationId: b.participants[0].id,
        allocationId: f.allocation.id,
        quantity: String(units * 10),
      },
    ],
  });
  return scheduleBatch(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
  });
}
