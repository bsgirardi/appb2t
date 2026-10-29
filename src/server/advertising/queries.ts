import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import type { AdLibraryQuery } from "@/domain/advertising/types";
import { adQuerySchema } from "@/domain/advertising/validation";
import { assertAdActor } from "./locks";
import { readAdDraft } from "./read";
import { adSourceOf, adProductSelect } from "./source";
export async function getAdDraft(actor: Actor, id: string) {
  return db.$transaction(
    async (tx) => {
      await assertAdActor(tx, actor);
      return readAdDraft(tx, id);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function listAdDrafts(actor: Actor, raw: AdLibraryQuery) {
  const query = adQuerySchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      await assertAdActor(tx, actor);
      const where = {
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  internalName: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  product: {
                    name: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            }
          : {}),
      };
      const total = await tx.advertisingDraft.count({ where });
      const ids = await tx.advertisingDraft.findMany({
        where,
        select: { id: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 20,
        skip: (query.page - 1) * 20,
      });
      const drafts = await Promise.all(ids.map((i) => readAdDraft(tx, i.id)));
      return { drafts, total, page: query.page, pages: Math.ceil(total / 20) };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function listAdProducts(
  actor: Actor,
  raw: { search: string; page: number },
) {
  const query = adQuerySchema.pick({ search: true, page: true }).parse(raw);
  return db.$transaction(
    async (tx) => {
      await assertAdActor(tx, actor);
      const where = query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: "insensitive" as const },
              },
              { sku: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {};
      const total = await tx.product.count({ where });
      const products = await tx.product.findMany({
        where,
        select: adProductSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 20,
        skip: (query.page - 1) * 20,
      });
      return {
        products: products.map(adSourceOf),
        total,
        pages: Math.ceil(total / 20),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
