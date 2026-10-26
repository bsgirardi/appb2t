import { expect, it } from "vitest";
import { setupDatabase, seedUser, password } from "./setup";
import { db } from "@/lib/db";
import { login } from "@/server/auth/service";
import { getSession, tokenHash } from "@/server/auth/session";
import { recoverAdminPassword } from "../../scripts/admin-password";

setupDatabase();
const nextPassword = "Nova-senha-teste-456!";

it("recovers only the selected admin, revokes sessions and clears login lockout", async () => {
  const admin = await seedUser();
  const other = await seedUser("ADMIN", "other@example.test");
  const session = await login(admin.email, password);
  const otherSession = await login(other.email, password);
  for (let i = 0; i < 5; i++)
    await expect(login(admin.email, "wrong")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  await recoverAdminPassword(" ADMIN@example.test ", nextPassword);
  expect(await getSession(session.token)).toBeNull();
  expect((await getSession(otherSession.token))?.id).toBe(other.id);
  expect(
    await db.loginAttempt.findUnique({
      where: { key: tokenHash(admin.email) },
    }),
  ).toBeNull();
  const saved = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
  expect(saved.version).toBe(admin.version + 1);
  expect(saved.passwordHash).not.toContain(nextPassword);
  expect(saved.role).toBe("ADMIN");
  expect(saved.active).toBe(true);
  await expect(login(admin.email, password)).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
  expect((await login(admin.email, nextPassword)).actor.id).toBe(admin.id);
  expect((await login(other.email, password)).actor.id).toBe(other.id);
});

it("rejects missing users, operators and inactive admins without changing accounts", async () => {
  const operator = await seedUser("OPERATOR", "operator@example.test");
  const inactive = await seedUser();
  await db.user.update({ where: { id: inactive.id }, data: { active: false } });
  for (const email of ["missing@example.test", operator.email, inactive.email])
    await expect(recoverAdminPassword(email, nextPassword)).rejects.toThrow();
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: operator.id } }))
      .passwordHash,
  ).toBe(operator.passwordHash);
  const saved = await db.user.findUniqueOrThrow({ where: { id: inactive.id } });
  expect(saved.passwordHash).toBe(inactive.passwordHash);
  expect(saved.active).toBe(false);
  expect(await db.user.count()).toBe(2);
});

it("rejects invalid credentials before changing the password or revoking sessions", async () => {
  const admin = await seedUser();
  const session = await login(admin.email, password);
  for (const secret of ["short", "x".repeat(129)])
    await expect(recoverAdminPassword(admin.email, secret)).rejects.toThrow();
  await expect(recoverAdminPassword("invalid", nextPassword)).rejects.toThrow();
  expect((await getSession(session.token))?.id).toBe(admin.id);
  expect((await login(admin.email, password)).actor.id).toBe(admin.id);
});
