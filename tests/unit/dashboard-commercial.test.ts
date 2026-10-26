import { expect, it } from "vitest";
import { summarizeCommercial } from "@/domain/dashboard/commercial";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
const f = resolveDashboardFilter({}, "ADMIN", new Date("2026-10-26T15:00Z"));
it("uses the quote creation cohort, real approval events and exact money", () => {
  const result = summarizeCommercial(
    {
      sales: [
        {
          id: "s1",
          customerId: "c",
          total: "0.10",
          date: "2026-10-01",
          items: [
            {
              productId: null,
              description: "Avulso",
              quantity: 1,
              value: "0.10",
            },
          ],
        },
        {
          id: "s2",
          customerId: "c",
          total: "0.20",
          date: "2026-10-02",
          items: [],
        },
      ],
      quotes: [
        {
          id: "q1",
          date: "2026-10-01",
          converted: true,
          approvedAt: "2026-10-03",
        },
        { id: "q2", date: "2026-10-02", converted: false, approvedAt: null },
        { id: "old", date: "2026-09-01", converted: true, approvedAt: null },
      ],
      priorCustomers: [],
    },
    f,
  );
  expect(result).toMatchObject({
    salesValue: "0.30",
    conversion: "50.00",
    conversionBase: 2,
    approvalDays: "2.00",
    approvalCoverage: "1/2",
    recurringCustomers: 1,
  });
  expect(result.products[0].name).toContain("Sem produto");
});
it("does not invent conversion or approval time for empty data", () => {
  expect(
    summarizeCommercial({ sales: [], quotes: [], priorCustomers: [] }, f),
  ).toMatchObject({ conversion: null, approvalDays: null, ticket: null });
});
it("includes earlier customers and aggregates the whole ranking", () => {
  const sales = Array.from({ length: 30 }, (_, i) => ({
    id: String(i),
    customerId: String(i),
    total: "10",
    date: "2026-10-01",
    items: [
      { productId: "p", description: "Produto", quantity: 2, value: "10" },
    ],
  }));
  const result = summarizeCommercial(
    { sales, quotes: [], priorCustomers: ["0"] },
    f,
  );
  expect(result.products[0]).toMatchObject({ quantity: 60, value: "300.00" });
  expect(result.recurringCustomers).toBe(1);
});
