import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "./auth/authorization";
import { hashPassword, verifyPassword } from "./auth/password";
import type { Actor } from "./auth/session";
import type { Prisma } from "@prisma/client";
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  version: true,
} as const;
export type UserDTO = Prisma.UserGetPayload<{ select: typeof userSelect }>;
const base = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["ADMIN", "OPERATOR"]),
});
const createSchema = base
  .extend({ password: z.string().min(12).max(128) })
  .strict();
const updateSchema = base
  .extend({ active: z.boolean(), expectedVersion: z.number().int().positive() })
  .strict();
export async function createUser(
  actor: Actor,
  input: unknown,
): Promise<UserDTO> {
  assertAdmin(actor);
  const v = createSchema.parse(input);
  const { password, ...data } = v;
  try {
    return await db.user.create({
      data: { ...data, passwordHash: await hashPassword(password) },
      select: userSelect,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      throw new AppError("CONFLICT", "Este e-mail já está cadastrado.");
    throw e;
  }
}
export async function updateUser(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<UserDTO> {
  assertAdmin(actor);
  const { expectedVersion, ...data } = updateSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(823701)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const acting = await tx.user.findUnique({ where: { id: actor.id } });
      if (!acting?.active || acting.role !== "ADMIN")
        throw new AppError("FORBIDDEN", "Acesso administrativo necessário.");
      const old = await tx.user.findUnique({ where: { id } });
      if (!old) throw new AppError("NOT_FOUND", "Usuário não encontrado.");
      if (old.version !== expectedVersion) throw conflict();
      if (
        old.active &&
        old.role === "ADMIN" &&
        (!data.active || data.role !== "ADMIN") &&
        (await tx.user.count({ where: { active: true, role: "ADMIN" } })) <= 1
      )
        throw new AppError(
          "VALIDATION",
          "Mantenha pelo menos um administrador ativo.",
        );
      const user = await tx.user.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
        select: userSelect,
      });
      if (!data.active || old.role !== data.role || old.email !== data.email)
        await tx.session.deleteMany({ where: { userId: id } });
      return user;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      throw new AppError("CONFLICT", "Este e-mail já está cadastrado.");
    throw e;
  }
}
export async function resetPassword(
  actor: Actor,
  id: string,
  password: string,
): Promise<void> {
  assertAdmin(actor);
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    if (!(await tx.user.findUnique({ where: { id } })))
      throw new AppError("NOT_FOUND", "Usuário não encontrado.");
    await tx.user.update({
      where: { id },
      data: { passwordHash, version: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: id } });
  });
}
export async function changeOwnPassword(
  actor: Actor,
  current: string,
  next: string,
): Promise<void> {
  const passwordHash = await hashPassword(next);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.id}))`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await verifyPassword(current, user.passwordHash)))
      throw new AppError("VALIDATION", "A senha atual está incorreta.");
    await tx.user.update({
      where: { id: actor.id },
      data: { passwordHash, version: { increment: 1 } },
    });
    await tx.session.deleteMany({ where: { userId: actor.id } });
  });
}
