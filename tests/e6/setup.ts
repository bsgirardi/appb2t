import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { assertE6DatabaseUrl } from "./database";
export function setupDatabase() {
  beforeEach(async () => {
    assertE6DatabaseUrl(process.env.DATABASE_URL ?? "");
    await db.$executeRawUnsafe('TRUNCATE "Product", "Session", "User" CASCADE');
  });
  afterAll(() => db.$disconnect());
}
