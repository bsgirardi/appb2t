import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, sale, date } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
import { saveOrder, releaseOrder } from "@/server/production/orders";
setupDatabase();
it("allocates sale targets under lock without reserving drafts", async () => {
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id);
  const stock = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  const draft = (targetUnits: number) =>
    saveOrder(a, {
      ...meta(),
      origin: "SALE",
      saleId: s.id,
      responsibleId: a.id,
      lines: [
        {
          saleLineKey: "line1",
          productId: p.id,
          description: "Peça",
          technology: "FDM",
          targetUnits,
        },
      ],
    });
  let first = await draft(6);
  const second = await draft(4),
    third = await draft(4);
  expect(await db.stockReservation.count()).toBe(0);
  first = await releaseOrder(a, { ...meta(first.version), orderId: first.id });
  const results = await Promise.allSettled([
    releaseOrder(a, { ...meta(second.version), orderId: second.id }),
    releaseOrder(a, { ...meta(third.version), orderId: third.id }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(first.status).toBe("LIBERADA");
  expect(await db.financialEntry.count()).toBe(0);
});
it("requires a real product inventory for stock production and preserves draft on failure", async () => {
  const a = await seedUser(),
    p = await product();
  const o = await saveOrder(a, {
    ...meta(),
    origin: "STOCK",
    lines: [
      {
        productId: p.id,
        description: "Peça",
        technology: "FDM",
        targetUnits: 3,
      },
    ],
  });
  await expect(
    releaseOrder(a, { ...meta(o.version), orderId: o.id }),
  ).rejects.toThrow();
  expect(
    (await db.productionOrder.findUniqueOrThrow({ where: { id: o.id } }))
      .status,
  ).toBe("RASCUNHO");
  await expect(
    saveOrder(a, {
      ...meta(),
      origin: "STOCK",
      lines: [{ description: "Avulsa", technology: "FDM", targetUnits: 1 }],
    }),
  ).rejects.toThrow();
});
