import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, sale } from "../fixtures/production";
setupDatabase();
it("enforces production ownership, signed movements and historical foreign keys in the database", async () => {
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id, 1);
  await expect(
    db.finishedStock.create({
      data: { productId: p.id, ownerSaleId: s.id, lineKey: "line1" },
    }),
  ).rejects.toThrow();
  await expect(
    db.productionOrder.create({ data: { origin: "STOCK", saleId: s.id } }),
  ).rejects.toThrow();
  const stock = await db.finishedStock.create({ data: { productId: p.id } }),
    origin = await db.finishedOrigin.create({
      data: { stockId: stock.id, kind: "OPENING" },
    });
  await expect(
    db.finishedMovement.create({
      data: {
        originId: origin.id,
        kind: "DELIVERY",
        units: 1,
        actorId: a.id,
        effectiveDate: new Date(),
      },
    }),
  ).rejects.toThrow();
  await db.finishedMovement.create({
    data: {
      originId: origin.id,
      kind: "OPENING",
      units: 1,
      actorId: a.id,
      effectiveDate: new Date(),
    },
  });
  await expect(
    db.finishedOrigin.delete({ where: { id: origin.id } }),
  ).rejects.toThrow();
  await expect(db.product.delete({ where: { id: p.id } })).rejects.toThrow();
});
