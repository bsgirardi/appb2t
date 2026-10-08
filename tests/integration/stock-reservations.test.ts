import { todaySaoPaulo } from "@/domain/commerce/dates";
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import {
  reserveStock,
  consumeStock,
  releaseReservation,
} from "@/server/stock/reservations";
import { balance } from "@/server/stock/movements";
import { receivePurchase } from "@/server/stock/receipts";
import { saveCustomer } from "@/server/customers";
import {
  saveSaleDraft,
  confirmSale,
  cancelSale,
  transitionSale,
} from "@/server/sales";
setupDatabase();
it("legacy sale consumption does not deduct available stock twice and cancellation releases remainder", async () => {
  const actor = await seedUser();
  const item = await saveStockItem(actor, {
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(actor, {
    itemId: item.id,
    quantity: "1000",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente",
    type: "PERSON",
    active: true,
  });
  const lineId = randomUUID();
  const draft = await saveSaleDraft(actor, undefined, {
    customerId: customer.id,
    items: [{ lineId, description: "Peças", quantity: 1, unitPrice: "100" }],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    actor,
    draft.id,
    draft.version,
    [{ number: 1, amount: "100", dueDate: todaySaoPaulo(new Date()) }],
    randomUUID(),
  );
  // This case exercises the pre-U3 manual status flow, retained for historical sales.
  await db.sale.update({
    where: { id: sale.id },
    data: { fulfillmentMode: "LEGACY" },
  });
  const reservation = await reserveStock(actor, {
    itemId: item.id,
    saleId: sale.id,
    lineKey: lineId,
    quantity: "1200",
    expectedVersion: 2,
    reason: "Material em compra",
    operationKey: randomUUID(),
    effectiveDate: todaySaoPaulo(new Date()),
  });
  expect((await db.$transaction((tx) => balance(tx, item.id))).available).toBe(
    "-200",
  );
  const production = await transitionSale(
    actor,
    sale.id,
    sale.version,
    "EM_PRODUCAO",
  );
  const ready = await transitionSale(
    actor,
    sale.id,
    production.version,
    "PRONTA",
  );
  await expect(
    transitionSale(actor, sale.id, ready.version, "ENTREGUE"),
  ).rejects.toThrow(/reservas/);
  await consumeStock(actor, {
    reservationId: reservation.id,
    quantity: "300",
    expectedVersion: 1,
    operationKey: randomUUID(),
    effectiveDate: todaySaoPaulo(new Date()),
  });
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "700",
    reserved: "900",
    available: "-200",
  });
  await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "500" }],
    expectedVersion: 0,
    operationKey: randomUUID(),
    effectiveDate: todaySaoPaulo(new Date()),
  });
  expect((await db.$transaction((tx) => balance(tx, item.id))).available).toBe(
    "300",
  );
  const release = {
    reservationId: reservation.id,
    quantity: "100",
    expectedVersion: 2,
    operationKey: randomUUID(),
    reason: "Sobra da reserva",
  };
  await releaseReservation(actor, release);
  await releaseReservation(actor, release);
  expect((await db.$transaction((tx) => balance(tx, item.id))).reserved).toBe(
    "800",
  );
  await expect(
    releaseReservation(actor, {
      ...release,
      quantity: "900",
      expectedVersion: 3,
      operationKey: randomUUID(),
    }),
  ).rejects.toThrow();
  await cancelSale(actor, sale.id, ready.version, "Cliente desistiu");
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "1200",
    reserved: "0",
    available: "1200",
  });
});
it.each(["reserve", "consume"] as const)(
  "serializes sale cancellation against concurrent %s",
  async (kind) => {
    const actor = await seedUser(),
      date = todaySaoPaulo(new Date());
    const item = await saveStockItem(actor, {
      name: "PLA corrida",
      unit: "G",
      method: "MANUAL",
      manualUnitCost: "1",
      expectedVersion: 0,
      operationKey: randomUUID(),
    });
    await openInventory(actor, {
      itemId: item.id,
      quantity: "100",
      effectiveDate: date,
      expectedVersion: 1,
      operationKey: randomUUID(),
    });
    const customer = await saveCustomer(actor, undefined, {
        name: "Cliente corrida",
        type: "PERSON",
        active: true,
      }),
      lineId = randomUUID();
    const draft = await saveSaleDraft(actor, undefined, {
      customerId: customer.id,
      items: [{ lineId, description: "Peça", quantity: 1, unitPrice: "100" }],
      discount: "0",
      shipping: "0",
      paymentTerms: "Pix",
      internalNotes: "",
    });
    const sale = await confirmSale(
      actor,
      draft.id,
      draft.version,
      [{ number: 1, amount: "100", dueDate: date }],
      randomUUID(),
    );
    const reserve = {
      itemId: item.id,
      saleId: sale.id,
      lineKey: lineId,
      quantity: "20",
      effectiveDate: date,
      expectedVersion: 2,
      operationKey: randomUUID(),
    };
    const reservation =
      kind === "consume" ? await reserveStock(actor, reserve) : null;
    const action =
      kind === "reserve"
        ? reserveStock(actor, reserve)
        : consumeStock(actor, {
            reservationId: reservation!.id,
            quantity: "10",
            expectedVersion: 1,
            effectiveDate: date,
            operationKey: randomUUID(),
          });
    const results = await Promise.allSettled([
      action,
      cancelSale(actor, sale.id, sale.version, "Cliente desistiu"),
    ]);
    expect(results[1].status).toBe("fulfilled");
    const state = await db.$transaction((tx) => balance(tx, item.id));
    expect(state.reserved).toBe("0");
    expect(state.physical).toBe(
      kind === "consume" && results[0].status === "fulfilled" ? "90" : "100",
    );
    expect(await db.cashMovement.count()).toBe(0);
  },
);
