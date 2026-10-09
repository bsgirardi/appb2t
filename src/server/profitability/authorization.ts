import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
export async function requireProfitabilityAdmin(actor: Actor): Promise<void> {
  const u = await db.user.findUnique({
    where: { id: actor.id },
    select: { role: true, active: true },
  });
  if (actor.role !== "ADMIN" || !u?.active || u.role !== "ADMIN")
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
}
