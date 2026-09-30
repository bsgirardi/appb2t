import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import { categorySchema } from "@/domain/finance/validation";
import type { CategoryDTO } from "@/domain/finance/types";
import { audit } from "./audit";
const select = {
  id: true,
  name: true,
  kind: true,
  active: true,
  version: true,
  systemCode: true,
} as const;
export async function listCategories(actor: Actor): Promise<CategoryDTO[]> {
  assertAdmin(actor);
  return db.financialCategory.findMany({ select, orderBy: { name: "asc" } });
}
export async function saveCategory(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<CategoryDTO> {
  assertAdmin(actor);
  const { expectedVersion, ...input } = categorySchema.parse(raw);
  return db.$transaction(async (tx) => {
    if (id) {
      await tx.$queryRaw`SELECT id FROM "FinancialCategory" WHERE id=${id} FOR UPDATE`;
      const old = await tx.financialCategory.findUnique({ where: { id } });
      if (!old || old.version !== expectedVersion) throw conflict();
      if (old.systemCode && (!input.active || input.kind !== old.kind))
        throw new AppError(
          "VALIDATION",
          "A categoria de sistema deve permanecer ativa e como receita.",
        );
      if (
        input.kind !== old.kind &&
        (await tx.financialEntry.count({ where: { categoryId: id } }))
      )
        throw new AppError(
          "CONFLICT",
          "Uma categoria utilizada não pode mudar de tipo.",
        );
    }
    const category = id
      ? await tx.financialCategory.update({
          where: { id },
          data: { ...input, version: { increment: 1 } },
          select,
        })
      : await tx.financialCategory.create({ data: input, select });
    await audit(
      tx,
      actor,
      "CATEGORY",
      category.id,
      id ? "EDIT" : "CREATE",
      input,
    );
    return category;
  });
}
