import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
export async function requireConsignmentActor(
  tx: Prisma.TransactionClient,
  actor: Actor,
  admin = false,
) {
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (
    !user?.active ||
    user.role !== actor.role ||
    (admin && user.role !== "ADMIN")
  )
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
}
