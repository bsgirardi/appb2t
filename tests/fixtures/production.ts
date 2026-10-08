import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export const meta = (expectedVersion = 0) => ({
  operationKey: randomUUID(),
  expectedVersion,
});
export const date = () => todaySaoPaulo(new Date());
export const product = () =>
  db.product.create({
    data: {
      name: "Peça de teste",
      description: "",
      paymentTerms: "",
      calculation: {},
      price: "10",
    },
  });
export async function sale(productId?: string, quantity = 10) {
  const c = await db.customer.create({
    data: { name: "Cliente teste", type: "PERSON" },
  });
  return db.sale.create({
    data: {
      customerId: c.id,
      status: "CONFIRMADA",
      fulfillmentMode: "U3",
      document: {},
      totals: {},
      items: {
        create: {
          position: 0,
          lineKey: "line1",
          productId,
          description: "Peça",
          quantity,
          unitPrice: "10",
        },
      },
    },
    include: { items: true },
  });
}
