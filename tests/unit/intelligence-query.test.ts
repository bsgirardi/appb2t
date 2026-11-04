import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  sales: vi.fn(),
  sources: vi.fn(),
  transaction: vi.fn(),
  user: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: mocks.transaction, user: { findUnique: mocks.user } },
}));
vi.mock("@/server/profitability/sources", () => ({
  readSaleSources: mocks.sources,
}));
import { getProfitabilityReport } from "@/server/profitability/queries";
import { completeInput } from "../fixtures/profitability";
const actor = {
  id: "admin",
  name: "Equipe",
  email: "a@example.test",
  role: "ADMIN" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ role: "ADMIN", active: true });
  mocks.transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({ sale: { findMany: mocks.sales } }),
  );
});
it("reads rankings across pages, tracks customer sources and Sao Paulo confirmation", async () => {
  mocks.sales.mockResolvedValue([
    {
      id: "a",
      customer: { id: "c", name: "Cliente" },
      events: [{ createdAt: new Date("2026-10-09T02:59:59Z") }],
    },
    {
      id: "b",
      customer: { id: "c", name: "Cliente" },
      events: [{ createdAt: new Date("2026-10-09T03:00:00Z") }],
    },
  ]);
  mocks.sources.mockImplementation((_tx, ids: string[]) =>
    ids.map((saleId) => ({ ...completeInput(), saleId })),
  );
  const f = { from: "2026-10-08", to: "2026-10-09", pageSize: "1" };
  const a = await getProfitabilityReport(actor, f);
  const b = await getProfitabilityReport(actor, { ...f, page: "2" });
  expect(a.items).toHaveLength(1);
  expect(a.items[0].saleId).not.toBe(b.items[0].saleId);
  expect(a.rankings).toEqual(b.rankings);
  expect(a.rankings.customers[0].sources.map((s) => s.id)).toEqual(["a", "b"]);
  expect(a.rankings.customers[0].summary.actual.value).toBe("180");
  const day = await getProfitabilityReport(actor, {
    from: "2026-10-08",
    to: "2026-10-08",
  });
  expect(day.rankings.customers[0].sources.map((s) => s.id)).toEqual(["a"]);
});
it("refuses OPERATOR before any data read", async () => {
  await expect(
    getProfitabilityReport({ ...actor, role: "OPERATOR" }, {}),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("leaves no ranked groups for exception-only or empty cohorts", async () => {
  mocks.sales.mockResolvedValue([
    { id: "a", customer: { id: "c", name: "Cliente" }, events: [] },
  ]);
  mocks.sources.mockResolvedValue([
    { ...completeInput(), saleId: "a", status: "CANCELADA" },
  ]);
  const result = await getProfitabilityReport(actor, {
    undated: "true",
    situation: "EXCEPTIONS",
  });
  expect(result.total).toBe(1);
  expect(result.rankings.customers).toEqual([]);
});
