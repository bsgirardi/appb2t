import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: (fn: (tx: unknown) => unknown) => fn({ sale: mocks }) },
}));
import { listSales } from "@/server/sales";
it("drills down to monthly sales without drafts and cancellations", async () => {
  await listSales(
    { id: "u", name: "Equipe", email: "a@example.com", role: "ADMIN" },
    { status: "realizadas", from: "2026-10-01", to: "2026-10-31" },
  );
  expect(mocks.findMany.mock.calls[0][0].where.status).toEqual({
    notIn: ["RASCUNHO", "CANCELADA"],
  });
});
