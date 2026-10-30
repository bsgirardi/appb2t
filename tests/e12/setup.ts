import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { assertE12DatabaseUrl } from "./database";
export function setupDatabase() {
  beforeEach(async () => {
    assertE12DatabaseUrl(process.env.DATABASE_URL ?? "");
    await db.$executeRawUnsafe(
      'TRUNCATE "PricingComparison", "PricingSnapshot", "PricingExtra", "PricingChannel", "PricingSettings", "Material", "Printer", "User" CASCADE',
    );
  });
  afterAll(() => db.$disconnect());
}
