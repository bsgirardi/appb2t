import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { db } from "@/lib/db";
setupDatabase();
it("database rejects invalid units and methods instead of storing an unusable ledger", async () => {
  await expect(
    db.stockItem.create({
      data: { name: "Inválido", unit: "KG", method: "AVERAGE" },
    }),
  ).rejects.toThrow();
  expect(await db.stockItem.count()).toBe(0);
});
