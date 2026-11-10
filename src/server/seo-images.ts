import { db } from "@/lib/db";
import { assertAdmin } from "./auth/authorization";
import type { Actor } from "./auth/session";
export async function seoImageOptions(actor: Actor) {
  assertAdmin(actor);
  const [products, collections] = await Promise.all([
    db.product.findMany({
      where: { active: true, images: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.collection.findMany({
      where: { active: true, image: { isNot: null } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  return [
    ...products.map((p) => ({
      value: `/api/products/${p.id}/image`,
      label: `Produto: ${p.name}`,
    })),
    ...collections.map((c) => ({
      value: `/api/collections/${c.id}/image`,
      label: `Coleção: ${c.name}`,
    })),
  ];
}
