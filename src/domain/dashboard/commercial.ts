import { D, sum, ratio, inPeriod } from "@/server/dashboard/shared";
import type { DashboardFilter } from "./types";
type Sale = {
  id: string;
  customerId: string;
  total: string;
  date: string;
  items: {
    productId: string | null;
    description: string;
    quantity: number;
    value: string;
  }[];
};
type Quote = {
  id: string;
  date: string;
  converted: boolean;
  approvedAt: string | null;
};
export function summarizeCommercial(
  input: { sales: Sale[]; quotes: Quote[]; priorCustomers: string[] },
  f: DashboardFilter,
) {
  const sales = input.sales.filter((s) => inPeriod(s.date, f));
  const quotes = input.quotes.filter((q) => inPeriod(q.date, f));
  const days = quotes
    .filter((q) => q.approvedAt && q.approvedAt >= q.date)
    .map((q) => (Date.parse(q.approvedAt!) - Date.parse(q.date)) / 86400000);
  const seen = new Set(input.priorCustomers),
    recurring = new Set<string>();
  [...sales]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .forEach((s) => {
      if (seen.has(s.customerId)) recurring.add(s.customerId);
      seen.add(s.customerId);
    });
  const products = new Map<
    string,
    { id: string; name: string; quantity: number; value: string }
  >();
  for (const item of sales.flatMap((s) => s.items)) {
    const id = item.productId ?? "__none__";
    const p = products.get(id) ?? {
      id,
      name: item.productId ? item.description : "Sem produto identificado",
      quantity: 0,
      value: "0",
    };
    p.quantity += item.quantity;
    p.value = new D(p.value).plus(item.value).toFixed(2);
    products.set(id, p);
  }
  const salesValue = sum(sales.map((s) => s.total)).toFixed(2);
  return {
    salesValue,
    salesCount: sales.length,
    ticket: sales.length
      ? new D(salesValue).div(sales.length).toFixed(2)
      : null,
    conversion: ratio(quotes.filter((q) => q.converted).length, quotes.length),
    conversionBase: quotes.length,
    approvalDays: days.length ? sum(days).div(days.length).toFixed(2) : null,
    approvalCoverage: `${days.length}/${quotes.length}`,
    recurringCustomers: recurring.size,
    products: [...products.values()].sort((a, b) =>
      new D(b.value).cmp(a.value),
    ),
  };
}
