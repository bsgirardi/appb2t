import { z } from "zod";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/server/auth/password";
import { tokenHash } from "../src/server/auth/session";

// Server-console recovery only; this function must not be exposed by an HTTP route.
export async function recoverAdminPassword(email: string, password: string) {
  const normalized = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .parse(email);
  const passwordHash = await hashPassword(password);
  const key = tokenHash(normalized);
  await db.$transaction(async (tx) => {
    // Coordinate with role changes and use the same lock order as login.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(823701)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const user = await tx.user.findUnique({ where: { email: normalized } });
    if (!user || user.role !== "ADMIN" || !user.active)
      throw new Error("Administrador ativo não encontrado para este e-mail.");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, version: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.loginAttempt.deleteMany({ where: { key } });
  });
}
