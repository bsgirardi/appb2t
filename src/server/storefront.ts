import { cache } from "react";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { productPath, summary } from "@/domain/products/storefront";
import type { PublicProductDTO } from "@/domain/products/types";
import type { Availability } from "@/domain/products/commercial";

const select = {
  sku: true,
  shortDescription: true,
  specifications: true,
  colors: true,
  sizes: true,
  availability: true,
  leadTimeDays: true,
  id: true,
  name: true,
  description: true,
  paymentTerms: true,
  price: true,
  seoTitle: true,
  seoDescription: true,
  images: {
    select: { id: true, position: true },
    orderBy: { position: "asc" as const },
  },
} as const;
type Row = Prisma.ProductGetPayload<{ select: typeof select }>;
function present(row: Row): PublicProductDTO {
  return {
    ...row,
    sku: row.sku ?? "",
    availability: row.availability as Availability,
    price: row.price.toFixed(2),
    imageUrl: `/api/products/${row.id}/image`,
    images: row.images.map((image) => ({
      ...image,
      url: `/api/products/${row.id}/images/${image.id}`,
    })),
  };
}
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
) {
  const where = {
    active: true,
    ...(collectionId
      ? {
          collections: { some: { collectionId, collection: { active: true } } },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { sku: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
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
  return { products: rows.map(present), total, pages: Math.ceil(total / 12) };
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
