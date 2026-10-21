import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { KitDTO } from "@/domain/kits/types";
import { kitDefinitionSchema, updateKitSchema } from "@/domain/kits/validation";
import { lockCatalog } from "@/server/catalog-memberships";
import { kitDTO, kitInclude } from "./queries";
export async function listKits(_actor: Actor): Promise<KitDTO[]> {
  return (
    await db.catalogKit.findMany({
      include: kitInclude,
      orderBy: [{ active: "desc" }, { position: "asc" }, { name: "asc" }],
    })
  ).map(kitDTO);
}
export async function saveKit(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<KitDTO> {
  return db.$transaction((tx) => saveKitWithClient(tx, actor, id, raw));
}
export async function saveKitWithClient(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<KitDTO> {
  const parsed = id
    ? updateKitSchema.parse(raw)
    : { ...kitDefinitionSchema.parse(raw), expectedVersion: undefined };
  const { expectedVersion, ...input } = parsed;
  await lockCatalog(tx);
  const old = id
    ? await tx.catalogKit.findUnique({ where: { id }, include: kitInclude })
    : null;
  if (id && !old) throw new AppError("NOT_FOUND", "Kit não encontrado.");
  if (old && old.version !== expectedVersion) throw conflict();
  const products = await tx.product.findMany({
    where: { id: { in: input.productIds } },
    select: { id: true, active: true, availability: true },
  });
  if (products.length !== input.productIds.length)
    throw new AppError("VALIDATION", "Revise os produtos permitidos.");
  if (
    input.active &&
    !products.some((p) => p.active && p.availability !== "UNAVAILABLE")
  )
    throw new AppError(
      "VALIDATION",
      "O kit precisa de ao menos um produto disponível.",
    );
  const { productIds, tiers, ...fields } = input;
  const commercial = (value: {
    active: boolean;
    productIds: string[];
    tiers: unknown;
  }) =>
    JSON.stringify([value.active, [...value.productIds].sort(), value.tiers]);
  const changed =
    old &&
    commercial({
      ...kitDTO(old),
      tiers: kitDTO(old)
        .tiers.slice()
        .sort((a, b) => a.minQuantity - b.minQuantity),
    }) !==
      commercial({
        ...input,
        tiers: tiers.slice().sort((a, b) => a.minQuantity - b.minQuantity),
      });
  const row = old
    ? await tx.catalogKit.update({
        where: { id: old.id },
        data: {
          ...fields,
          tiers: tiers as Prisma.InputJsonValue,
          version: { increment: 1 },
          commercialRevision: { increment: changed ? 1 : 0 },
        },
      })
    : await tx.catalogKit.create({
        data: { ...fields, tiers: tiers as Prisma.InputJsonValue },
      });
  await tx.catalogKitProduct.deleteMany({ where: { kitId: row.id } });
  if (productIds.length)
    await tx.catalogKitProduct.createMany({
      data: productIds.map((productId) => ({ kitId: row.id, productId })),
    });
  await tx.catalogKitEvent.create({
    data: {
      kitId: row.id,
      action: old ? "UPDATED" : "CREATED",
      actorId: actor.id,
      actorName: actor.name,
    },
  });
  return kitDTO(
    await tx.catalogKit.findUniqueOrThrow({
      where: { id: row.id },
      include: kitInclude,
    }),
  );
}
