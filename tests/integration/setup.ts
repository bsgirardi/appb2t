import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";
export const password = "Teste-interno-123!";
export function setupDatabase() {
  beforeEach(async () => {
    const url = new URL(process.env.DATABASE_URL || "http://missing");
    if (
      url.pathname !== "/b2t_test" ||
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      throw new Error("Tests require local b2t_test database");
    await db.$executeRawUnsafe(
      'TRUNCATE "Collection", "ProductImage", "Product", "Session", "CalculationSettings", "LoginAttempt", "Material", "Printer", "User" CASCADE',
    );
  });
  afterAll(async () => {
    await db.$disconnect();
  });
}
export async function seedUser(
  role: "ADMIN" | "OPERATOR" = "ADMIN",
  email = "admin@example.test",
) {
  return db.user.create({
    data: {
      name: "Usuário de teste",
      email,
      role,
      passwordHash: await hashPassword(password),
    },
  });
}
