import { beforeEach, afterAll, expect, it } from "vitest";
import { db } from "@/lib/db";
import { assertPosDatabaseUrl } from "./database";
import {
  startPosOrder,
  savePosOrder,
  completePosOrder,
  getPosOrder,
} from "@/server/pos/orders";
import { emptyPosDraft } from "@/domain/pos/types";
import { originBalance } from "@/server/production/finished-stock";
import { saveSaleDraft, confirmSale } from "@/server/sales";
import { reserveFinished } from "@/server/production/fulfillment";
import { randomUUID } from "node:crypto";
beforeEach(async () => {
  assertPosDatabaseUrl(process.env.DATABASE_URL!);
  await db.$executeRawUnsafe(
    'TRUNCATE "User", "Customer", "Product", "Sale", "FinishedStock", "FinancialCategory", "PlanningState" CASCADE',
  );
  await db.financialCategory.create({
    data: {
      id: "system-sale-revenue",
      name: "Vendas",
      kind: "REVENUE",
      systemCode: "SALE_REVENUE",
    },
  });
});
afterAll(() => db.$disconnect());
async function fixture(units = 3) {
  const actor = await db.user.create({
    data: {
      name: "Operador sintético",
      email: "pdv@example.test",
      passwordHash: "not-a-login",
      role: "OPERATOR",
    },
  });
  const product = await db.product.create({
    data: {
      name: "Peça simples",
      description: "Sintética",
      paymentTerms: "Pix",
      calculation: {},
      price: "19.90",
      availability: "AVAILABLE",
      quantityTiers: [{ minQuantity: 2, baseUnitPrice: "18.00" }],
    },
  });
  const stock = await db.finishedStock.create({
    data: { productId: product.id, inventoriedAt: new Date() },
  });
  const origin = await db.finishedOrigin.create({
    data: {
      stockId: stock.id,
      kind: "OPENING",
      initialValue: "10",
      movements: {
        create: {
          kind: "OPENING",
          units,
          actorId: actor.id,
          effectiveDate: new Date(),
        },
      },
    },
  });
  return { actor, product, stock, origin };
}
async function draft(
  f: Awaited<ReturnType<typeof fixture>>,
  quantity = 1,
  extra = {},
) {
  const order = await startPosOrder(f.actor);
  return savePosOrder(f.actor, order.id, {
    expectedVersion: order.version,
    input: {
      ...emptyPosDraft,
      items: [
        {
          productId: f.product.id,
          quantity,
          commercialRevision: 1,
          unitPrice: quantity >= 2 ? "18.00" : "19.90",
        },
      ],
      ...extra,
    },
  });
}
it("conclui anônimo, entrega uma vez, mantém recebível sem baixa e recupera resposta", async () => {
  const f = await fixture();
  const o = await draft(f);
  const result = await completePosOrder(f.actor, o.id, o.version);
  expect(result.receipt).toMatchObject({
    status: "ENTREGUE",
    total: "19.90",
    customerName: "Consumidor não identificado",
    received: "0.00",
    pending: "19.90",
  });
  expect(
    (await completePosOrder(f.actor, o.id, o.version)).receipt?.saleId,
  ).toBe(result.receipt?.saleId);
  expect((await getPosOrder(f.actor))?.receipt?.saleId).toBe(
    result.receipt?.saleId,
  );
  expect(await db.customer.count()).toBe(0);
  expect(await db.sale.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
  expect(await db.cashMovement.count()).toBe(0);
  expect(
    await db.$transaction((tx) => originBalance(tx, f.origin.id)),
  ).toMatchObject({ available: "2", physical: "2" });
  expect((await db.sale.findFirst())?.customerId).toBeNull();
  await expect(
    savePosOrder(f.actor, o.id, {
      expectedVersion: o.version,
      input: emptyPosDraft,
    }),
  ).rejects.toThrow();
});
it("cadastro real opcional é atômico e não duplica no reenvio", async () => {
  const f = await fixture();
  const o = await draft(f, 2, {
    newCustomer: {
      name: "Cliente real sintético",
      phone: "11999999999",
      email: "",
    },
    method: "CASH",
    tendered: "40.00",
    discount: "1.00",
  });
  const result = await completePosOrder(f.actor, o.id, o.version);
  expect(result.receipt).toMatchObject({
    total: "35.00",
    payment: { change: "5.00" },
  });
  await completePosOrder(f.actor, o.id, o.version);
  expect(await db.customer.count()).toBe(1);
  expect((await db.sale.findFirst())?.customerId).not.toBeNull();
});
it("usa cliente existente, rejeita inativo e preserva rascunho após falha", async () => {
  const f = await fixture();
  const c = await db.customer.create({
    data: { name: "Cliente existente", type: "PERSON", active: false },
  });
  const o = await draft(f, 1, {
    customerId: c.id,
    customerVersion: c.version,
    customerName: c.name,
  });
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow();
  expect(await db.sale.count()).toBe(0);
  await db.customer.update({ where: { id: c.id }, data: { active: true } });
  expect(
    (await completePosOrder(f.actor, o.id, o.version)).receipt?.customerName,
  ).toBe(c.name);
});
it("exige reconferência se o cadastro do comprador mudou após seleção", async () => {
  const f = await fixture();
  const c = await db.customer.create({
    data: { name: "Nome conferido", type: "PERSON" },
  });
  const o = await draft(f, 1, {
    customerId: c.id,
    customerVersion: c.version,
    customerName: c.name,
  });
  await db.customer.update({
    where: { id: c.id },
    data: { name: "Nome alterado", version: { increment: 1 } },
  });
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow(
    /cliente.*mudou/i,
  );
  expect(await db.sale.count()).toBe(0);
});
it("falta de estoque desfaz cadastro, venda, parcelas e entrega", async () => {
  const f = await fixture(1);
  const o = await draft(f, 2, {
    newCustomer: { name: "Não persistir", phone: "", email: "" },
  });
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow();
  expect(await db.customer.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
  expect(await db.financialEntry.count()).toBe(0);
  expect(await db.productionDelivery.count()).toBe(0);
});
it("dois operadores disputam última peça e só uma venda é concluída", async () => {
  const f = await fixture(1);
  const o = await draft(f);
  const second = await db.user.create({
    data: {
      name: "Outro operador",
      email: "other@example.test",
      passwordHash: "not-a-login",
      role: "OPERATOR",
    },
  });
  const p = await draft({ ...f, actor: second });
  const results = await Promise.allSettled([
    completePosOrder(f.actor, o.id, o.version),
    completePosOrder(second, p.id, p.version),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.sale.count()).toBe(1);
  expect(
    await db.$transaction((tx) => originBalance(tx, f.origin.id)),
  ).toMatchObject({ available: "0" });
});
it("rejeita revisão comercial alterada, versão obsoleta e outro operador", async () => {
  const f = await fixture();
  const o = await draft(f);
  await expect(
    savePosOrder(f.actor, o.id, { expectedVersion: 1, input: emptyPosDraft }),
  ).rejects.toThrow();
  await db.product.update({
    where: { id: f.product.id },
    data: { commercialRevision: 2 },
  });
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow();
  expect(await db.sale.count()).toBe(0);
  const other = { ...f.actor, id: "unknown" };
  await expect(completePosOrder(other, o.id, o.version)).rejects.toThrow();
});
it("duas conclusões simultâneas do mesmo pedido criam uma venda e um cadastro", async () => {
  const f = await fixture();
  const o = await draft(f, 1, {
    newCustomer: { name: "Compra concorrente", phone: "", email: "" },
  });
  const result = await Promise.all([
    completePosOrder(f.actor, o.id, o.version),
    completePosOrder(f.actor, o.id, o.version),
  ]);
  expect(result[0].receipt?.saleId).toBe(result[1].receipt?.saleId);
  expect(await db.customer.count()).toBe(1);
  expect(await db.sale.count()).toBe(1);
  expect(await db.productionDelivery.count()).toBe(1);
});
it("não usa peças reservadas para outra venda e bloqueia produtos configuráveis", async () => {
  const f = await fixture(1);
  const customer = await db.customer.create({
    data: { name: "Outra venda", type: "PERSON" },
  });
  const normal = await saveSaleDraft(f.actor, undefined, {
    customerId: customer.id,
    items: [
      {
        lineId: "line",
        productId: f.product.id,
        description: f.product.name,
        quantity: 1,
        unitPrice: "19.90",
      },
    ],
    discount: "0.00",
    shipping: "0.00",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    f.actor,
    normal.id,
    normal.version,
    [
      {
        number: 1,
        amount: "19.90",
        dueDate: new Date().toISOString().slice(0, 10),
      },
    ],
    randomUUID(),
  );
  await reserveFinished(f.actor, {
    operationKey: randomUUID(),
    expectedVersion: f.stock.version,
    saleVersion: sale.version,
    saleId: sale.id,
    lineKey: "line",
    stockId: f.stock.id,
    units: 1,
    originAllocations: [{ originId: f.origin.id, units: 1 }],
  });
  const o = await draft(f);
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow(
    /insuficientes/,
  );
  await db.product.update({
    where: { id: f.product.id },
    data: { colors: ["Azul"] },
  });
  await expect(completePosOrder(f.actor, o.id, o.version)).rejects.toThrow(
    /comercial/,
  );
  expect(await db.sale.count()).toBe(1);
});
