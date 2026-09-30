import { db } from "@/lib/db";
import type { Actor } from "../auth/session";
import type { CustomerDTO } from "@/domain/customers/types";
// Private commercial selectors expose no production costs or customer notes.
export async function commerceOptions(_actor: Actor) {
  void _actor;
  const [rows, products] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const customers: CustomerDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    document: c.document,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: "",
    active: c.active,
    version: c.version,
  }));
  return {
    customers,
    products: products.map((p) => ({ ...p, price: p.price.toFixed(2) })),
  };
}
