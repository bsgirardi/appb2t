import { it, expect } from "vitest";
import { setupDatabase, seedUser, password } from "./setup";
import { login } from "@/server/auth/service";
import { getSession, logout } from "@/server/auth/session";
import { db } from "@/lib/db";
setupDatabase();
it("stores only session hash and revokes on logout", async () => {
  const u = await seedUser();
  const s = await login(" ADMIN@example.test ", password);
  expect((await getSession(s.token))?.id).toBe(u.id);
  expect((await db.session.findFirst())?.tokenHash).not.toBe(s.token);
  await logout(s.token);
  expect(await getSession(s.token)).toBeNull();
});
it("rejects inactive and expired sessions", async () => {
  const u = await seedUser();
  const s = await login(u.email, password);
  await db.session.updateMany({ data: { expiresAt: new Date(0) } });
  expect(await getSession(s.token)).toBeNull();
  const other = await login(u.email, password);
  await db.user.update({ where: { id: u.id }, data: { active: false } });
  expect(await getSession(other.token)).toBeNull();
});
it("uses the same error for unknown email and incorrect password", async () => {
  await seedUser();
  await expect(login("missing@example.test", password)).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
    message: "E-mail ou senha inválidos.",
  });
  await expect(
    login("admin@example.test", "bad-password"),
  ).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
    message: "E-mail ou senha inválidos.",
  });
});
it("rate limits the sixth failed attempt across login calls", async () => {
  for (let i = 0; i < 5; i++)
    await expect(login("missing@example.test", password)).rejects.toMatchObject(
      { code: "UNAUTHENTICATED" },
    );
  await expect(login("missing@example.test", password)).rejects.toMatchObject({
    code: "RATE_LIMIT",
  });
});
