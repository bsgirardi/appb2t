import { listPublicCollections } from "@/server/collections";
import { catalogPath } from "@/domain/products/catalog-navigation";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { productPath } from "@/domain/products/storefront";
import { getPublicAppearance } from "@/server/appearance";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, identity] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      select: { id: true, name: true, updatedAt: true },
    }),
    listPublicCollections(),
    getPublicAppearance(),
  ]);
  const absolute = (path: string) => new URL(path, appUrl()).href;
  return [
    { url: absolute("/") },
    ...(identity.storefront?.aboutText
      ? [{ url: absolute("/portfolio/sobre") }]
      : []),
    ...(identity.storefront?.faq.length
      ? [{ url: absolute("/portfolio/ajuda") }]
      : []),
    ...collections.map((c) => ({
      url: absolute(catalogPath(c.slug ?? c.id)),
    })),
    ...products.map((p) => ({
      url: absolute(productPath(p)),
      lastModified: p.updatedAt,
    })),
  ];
}
