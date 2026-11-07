import { createRoot } from "react-dom/client";
import { QuotePanel } from "@/components/commerce/quote-panel";
import { SalePanel } from "@/components/commerce/sale-panel";
import { AppShell } from "@/components/shell/app-shell";
import { listCustomer, listQuotes, listSales } from "./fixtures/commerce-lists";
import "@/app/design.css";

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const filtered = params.has("filtered");
const filters = {
  search: filtered ? "Associação de artesãos e projetos especiais" : "",
  status: "all",
  ...(filtered ? { from: "2026-11-01", to: "2026-11-07" } : {}),
};
const page = {
  total: params.has("outside") ? 45 : params.has("empty") ? 0 : 6,
  page: params.has("outside") ? 9 : 1,
  pageSize: 20,
};
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "preview",
      name: "Revisão sintética",
      email: "preview@example.test",
      role: "ADMIN",
    }}
  >
    {params.get("view") === "sales" ? (
      <SalePanel
        initial={{
          ...page,
          items: params.has("empty") || params.has("outside") ? [] : listSales,
        }}
        filters={{
          ...filters,
          ...(filtered ? { customerId: listCustomer.id } : {}),
        }}
        customers={[listCustomer]}
        products={[]}
      />
    ) : (
      <QuotePanel
        initial={{
          ...page,
          items: params.has("empty") || params.has("outside") ? [] : listQuotes,
        }}
        filters={filters}
        customers={[listCustomer]}
        products={[]}
      />
    )}
  </AppShell>,
);
