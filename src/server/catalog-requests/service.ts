import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { requestChangeSchema } from "@/domain/catalog-requests/validation";
import { canChangeRequest } from "@/domain/catalog-requests/states";
import type { CatalogRequestDTO } from "@/domain/catalog-requests/types";
import { getCatalogRequestWithClient } from "./queries";
export async function lockCatalogRequest(
  tx: Prisma.TransactionClient,
  id: string,
) {
  await tx.$queryRaw`SELECT id FROM "CatalogRequest" WHERE id=${id} FOR UPDATE`;
  const row = await tx.catalogRequest.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Solicitação não encontrada.");
  return row;
}
export async function changeCatalogRequest(
  actor: Actor,
  id: string,
  raw: unknown,
): Promise<CatalogRequestDTO> {
  const change = requestChangeSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const row = await lockCatalogRequest(tx, id);
    if (row.version !== change.expectedVersion) throw conflict();
    if (!canChangeRequest(row.state, change))
      throw new AppError(
        "CONFLICT",
        "Esta ação não está disponível neste estado.",
      );
    let state = row.state;
    let assigneeId = row.assigneeId;
    if ("assigneeId" in change) {
      const assignee = await tx.user.findFirst({
        where: { id: change.assigneeId, active: true },
      });
      if (!assignee)
        throw new AppError("VALIDATION", "Escolha uma pessoa ativa da equipe.");
      assigneeId = assignee.id;
      if (["START", "REOPEN"].includes(change.action)) state = "EM_ATENDIMENTO";
    }
    if (change.action === "CLOSE") state = "ENCERRADA";
    await tx.catalogRequest.update({
      where: { id },
      data: {
        state,
        assigneeId,
        version: { increment: 1 },
        events: {
          create: {
            action: change.action,
            note: "note" in change ? change.note : `Responsável: ${assigneeId}`,
            actorId: actor.id,
            actorName: actor.name,
          },
        },
      },
    });
    return getCatalogRequestWithClient(tx, id);
  });
}
