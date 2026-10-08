import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import {
  allocateSaleReservation,
  reserveOrderMaterial,
} from "@/server/production/reservations";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { reserveStock, releaseReservation } from "@/server/stock/reservations";
setupDatabase();
it("splits an existing material reservation without multiplying its total", async () => {
  const a = await seedUser(),
    s = await sale();
  const item = await saveStockItem(a, {
    ...meta(),
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
  });
  await openInventory(a, {
    ...meta(item.version),
    itemId: item.id,
    quantity: "120",
    value: "12",
    effectiveDate: date(),
  });
  const r = await reserveStock(a, {
    ...meta(2),
    saleId: s.id,
    lineKey: "line1",
    itemId: item.id,
    quantity: "120",
    effectiveDate: date(),
  });
  const create = async () => {
    const d = await saveOrder(a, {
      ...meta(),
      origin: "SALE",
      saleId: s.id,
      lines: [
        {
          saleLineKey: "line1",
          description: "Peça",
          technology: "FDM",
          targetUnits: 5,
        },
      ],
    });
    return releaseOrder(a, { ...meta(d.version), orderId: d.id });
  };
  const x = await create(),
    y = await create();
  const first = await allocateSaleReservation(a, {
    ...meta(x.version),
    lineId: x.lines[0].id,
    reservationId: r.id,
    reservationVersion: r.version,
    quantity: "70",
  });
  await allocateSaleReservation(a, {
    ...meta(y.version),
    lineId: y.lines[0].id,
    reservationId: r.id,
    reservationVersion: r.version,
    quantity: "50",
  });
  await expect(
    allocateSaleReservation(a, {
      ...meta(first.version),
      lineId: x.lines[0].id,
      reservationId: r.id,
      reservationVersion: r.version,
      quantity: "1",
    }),
  ).rejects.toThrow();
  expect(await db.stockReservationEvent.count()).toBe(1);
  await expect(
    releaseReservation(a, {
      ...meta(r.version),
      reservationId: r.id,
      quantity: "1",
      reason: "Teste",
    }),
  ).rejects.toThrow();
  await expect(
    reserveOrderMaterial(a, {
      ...meta(first.version),
      lineId: x.lines[0].id,
      itemId: item.id,
      quantity: "1",
      effectiveDate: date(),
    }),
  ).rejects.toThrow();
});
