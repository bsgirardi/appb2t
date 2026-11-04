import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";
import { assertE22DatabaseUrl } from "./database";
export function setupDatabase() {
  beforeEach(async () => {
    assertE22DatabaseUrl(process.env.DATABASE_URL ?? "");
    const tables = await db.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    const names = tables
      .map((t) => '"' + t.tablename.replaceAll('"', '""') + '"')
      .join(", ");
    if (names) await db.$executeRawUnsafe(`TRUNCATE ${names} CASCADE`);
    await db.financialCategory.create({
      data: {
        id: "system-sale-revenue",
        name: "Receita de vendas",
        kind: "REVENUE",
        systemCode: "SALE_REVENUE",
      },
    });
  });
  afterAll(() => db.$disconnect());
}
export async function seedUser() {
  return db.user.create({
    data: {
      name: "Admin sintético E22",
      email: "admin@e22.test",
      role: "ADMIN",
      passwordHash: await hashPassword("Synthetic-e22-123!"),
    },
  });
}
