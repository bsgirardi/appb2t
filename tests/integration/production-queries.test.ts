import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, sale } from "../fixtures/production";
import { listFinished } from "@/server/production/queries";
setupDatabase();
it("loads relevant sale inventory independently of the general stock first page", async () => {
  const a = await seedUser();
  for (let i = 0; i < 22; i++) {
    const p = await product();
    await db.finishedStock.create({
      data: { id: `stock-${String(i).padStart(2, "0")}`, productId: p.id },
    });
  }
  const p = await product(),
    s = await sale(p.id);
  await db.finishedStock.create({
    data: { id: "stock-zz-relevant", productId: p.id },
  });
  const result = await listFinished(a, { saleId: s.id });
  expect(result.items.map((x) => x.productId)).toEqual([p.id]);
});
