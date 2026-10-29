import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
export async function assertAdActor(
  tx: Prisma.TransactionClient,
  actor: Actor,
) {
  if (
    !actor?.id ||
    !(await tx.user.findFirst({
      where: {
        id: actor.id,
        active: true,
        role: { in: ["ADMIN", "OPERATOR"] },
      },
      select: { id: true },
    }))
  )
    throw new AppError("FORBIDDEN", "Entre com um usuário ativo da equipe.");
}
