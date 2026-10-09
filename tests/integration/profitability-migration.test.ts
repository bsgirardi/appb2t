import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { sale, meta, date } from "../fixtures/production";
import { adminPayload } from "../fixtures/profitability";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
setupDatabase();
it("keeps commercial rows intact and prevents a foreign revision pointer", async () => {
  const a = await seedUser("ADMIN"),
    s = await sale(),
    other = await sale();
  expect(await db.profitabilityRevision.count()).toBe(0);
  const before = await db.sale.findUnique({
    where: { id: s.id },
    include: { items: true, installments: true },
  });
  const r = await saveProfitabilityRevision(a, {
    ...meta(),
    saleId: s.id,
    effectiveDate: date(),
    reason: "Conferência",
    payload: adminPayload(),
  });
  expect(
    await db.sale.findUnique({
      where: { id: s.id },
      include: { items: true, installments: true },
    }),
  ).toEqual(before);
  await expect(
    db.profitabilityState.create({
      data: { saleId: other.id, version: 1, currentRevisionId: r.id },
    }),
  ).rejects.toThrow();
  await expect(
    db.profitabilityRevision.delete({ where: { id: r.id } }),
  ).rejects.toThrow();
});
