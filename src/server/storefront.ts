import {
  publicProductSelect as select,
  toPublicProduct as present,
} from "./product-public";
import { cache } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  parseCatalogCommercialFilters,
  type CatalogCommercialFilters,
} from "@/domain/products/catalog-commercial-filters";
import { appUrl } from "@/lib/env";
import { productPath, summary } from "@/domain/products/storefront";
import type { PublicProductDTO } from "@/domain/products/types";
import { searchTerms } from "@/domain/products/catalog-search";
import { searchCatalog } from "./catalog-search";

export const publicProduct = cache(async (id: string) => {
  const row = await db.product.findFirst({
    where: { id, active: true },
    select,
  });
  return row ? present(row) : null;
});
export async function relatedProducts(id: string): Promise<PublicProductDTO[]> {
  const rows = await db.product.findMany({
    where: {
      id: { not: id },
      active: true,
      availability: { not: "UNAVAILABLE" },
      collections: {
        some: {
          collection: {
            active: true,
            products: { some: { productId: id, product: { active: true } } },
          },
        },
      },
    },
    select,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 4,
  });
  return rows.map(present);
}
export async function catalogPage(
  collectionId: string | undefined,
  search: string,
  order: string,
  page: number,
  commercial: CatalogCommercialFilters = {},
) {
  const criteria = parseCatalogCommercialFilters(commercial);
  if (searchTerms(search).length)
    return searchCatalog(collectionId, search, order, page, criteria);
  const hasPriceRange =
    criteria.priceMin !== undefined || criteria.priceMax !== undefined;
  const where = {
    active: true,
    ...(criteria.availability ? { availability: criteria.availability } : {}),
    ...(criteria.priceMin !== undefined || criteria.priceMax !== undefined
      ? {
          publicPriceMode: "REFERENCE",
          price: {
            ...(criteria.priceMin !== undefined
              ? { gte: criteria.priceMin }
              : {}),
            ...(criteria.priceMax !== undefined
              ? { lte: criteria.priceMax }
              : {}),
          },
        }
      : {}),
    ...(collectionId
      ? {
          collections: { some: { collectionId, collection: { active: true } } },
        }
      : {}),
  };
  if (order === "menor-preco" || order === "maior-preco") {
    return db.$transaction(
      async (tx) => {
        const referenceWhere = { ...where, publicPriceMode: "REFERENCE" };
        const consultWhere = { ...where, publicPriceMode: "CONSULT" };
        const [references, total] = await Promise.all([
          tx.product.count({ where: referenceWhere }),
          tx.product.count({ where }),
        ]);
        const offset = (page - 1) * 12;
        const knownTake = Math.max(0, Math.min(12, references - offset));
        const known = knownTake
          ? await tx.product.findMany({
              where: referenceWhere,
              select,
              orderBy: [
                { price: order === "menor-preco" ? "asc" : "desc" },
                { name: "asc" },
                { id: "asc" },
              ],
              skip: offset,
              take: knownTake,
            })
          : [];
        const consulted =
          knownTake < 12 && !hasPriceRange
            ? await tx.product.findMany({
                where: consultWhere,
                select,
                orderBy: [{ name: "asc" }, { id: "asc" }],
                skip: Math.max(0, offset - references),
                take: 12 - knownTake,
              })
            : [];
        return {
          products: [...known, ...consulted].map(present),
          total,
          pages: Math.ceil(total / 12),
          approximate: false,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  const orderBy =
    order === "menor-preco"
      ? [{ price: "asc" as const }, { id: "asc" as const }]
      : order === "maior-preco"
        ? [{ price: "desc" as const }, { id: "asc" as const }]
        : order === "recentes"
          ? [{ createdAt: "desc" as const }, { id: "asc" as const }]
          : [{ name: "asc" as const }, { id: "asc" as const }];
  const [rows, total] = await db.$transaction([
    db.product.findMany({
      where,
      select,
      orderBy,
      take: 12,
      skip: (page - 1) * 12,
    }),
    db.product.count({ where }),
  ]);
  return {
    products: rows.map(present),
    total,
    pages: Math.ceil(total / 12),
    approximate: false,
  };
}
export async function featuredCollections(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.collection.findMany({
    where: { id: { in: ids }, active: true },
    select: {
      id: true,
      name: true,
      description: true,
      products: {
        where: { product: { active: true } },
        orderBy: { product: { name: "asc" } },
        take: 4,
        select: { product: { select } },
      },
    },
  });
  return ids.flatMap((id) => {
    const row = rows.find((c) => c.id === id);
    return row?.products.length
      ? [{ ...row, products: row.products.map((p) => present(p.product)) }]
      : [];
  });
}
export function publicMetadata(
  title: string,
  description: string,
  path: string,
  image?: string,
): Metadata {
  const url = new URL(path, appUrl()).href;
  const images = image
    ? [{ url: new URL(image, appUrl()).href, alt: title }]
    : [];
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title,
      description,
      url,
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
export function productMetadata(product: PublicProductDTO, company: string) {
  return publicMetadata(
    product.seoTitle || `${product.name} | ${company}`,
    product.seoDescription || summary(product.description),
    productPath(product),
    product.images[0]?.url,
  );
}
