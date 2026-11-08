// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
  fireEvent,
} from "@testing-library/react";
import ProductionPage from "@/app/(private)/producao/page";
import StockPage from "@/app/(private)/estoque/page";
import { operationOptions } from "../fixtures/operations";
vi.mock("@/server/auth/guards", () => ({
  requireActor: async () => ({ role: "OPERATOR" }),
}));
vi.mock("@/server/production/queries", async (original) => ({
  ...(await original<typeof import("@/server/production/queries")>()),
  listOrders: async () => ({ items: [], total: 23 }),
  listFinished: async () => ({ items: [], total: 0 }),
  productionOptions: async () => operationOptions,
  saleProduction: async () => null,
}));
vi.mock("@/server/stock/queries", () => ({
  listStock: async () => ({ items: [], total: 0 }),
  listReceipts: async () => ({ items: [], total: 23 }),
  listReservations: async () => ({ items: [], total: 0 }),
  stockOptions: async () => ({ materials: [], extras: [] }),
  getStock: async () => null,
}));
vi.mock("@/server/finance/categories", () => ({
  listCategories: async () => [],
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
it("does not claim negative availability when invalid filters fall back to all materials", async () => {
  render(
    await StockPage({
      searchParams: Promise.resolve({ view: "shortage", page: "0" }),
    }),
  );
  expect(
    screen.getByRole("region", { name: "Contexto dos resultados" }).textContent,
  ).not.toContain("Disponível negativo");
  expect(
    screen.getByText("Filtros inválidos. Exibindo a primeira página."),
  ).toBeTruthy();
});
it("does not describe order-only criteria as applied to finished pieces", async () => {
  render(
    await ProductionPage({
      searchParams: Promise.resolve({
        view: "finished",
        status: "LIBERADA",
        dueFrom: "2026-11-01",
      }),
    }),
  );
  const context = screen.getByRole("region", {
    name: "Contexto dos resultados",
  });
  expect(context.textContent).not.toContain("Estado:");
  expect(context.textContent).not.toContain("Prazo a partir de:");
  expect(screen.queryByRole("button", { name: /ativos/ })).toBeNull();
});
it("describes applied production filters while retaining edited controls and URL context", async () => {
  render(
    await ProductionPage({
      searchParams: Promise.resolve({
        query: "Peça",
        status: "LIBERADA",
        origin: "SALE",
        responsibleId: "preview-user",
        dueFrom: "2026-11-01",
        dueTo: "2026-11-07",
        saleId: "sale-context",
      }),
    }),
  );
  const context = screen.getByRole("region", {
    name: "Contexto dos resultados",
  });
  expect(context.textContent).toContain("Estado: Liberada");
  expect(context.textContent).toContain("Responsável: Equipe de teste");
  expect(context.textContent).toContain("Prazo até: 07/11/2026");
  expect(context.textContent).toContain("Venda selecionada");
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText("Buscar item"), {
    target: { value: "Rascunho" },
  });
  expect(context.textContent).toContain("Busca: Peça");
  expect(context.textContent).not.toContain("Rascunho");
  const form = screen.getByLabelText("Buscar item").closest("form")!;
  expect(form.method).toBe("get");
  expect(new FormData(form).get("saleId")).toBe("sale-context");
  const next = new URL(
    screen.getByRole("link", { name: "Próxima" }).getAttribute("href")!,
    "https://test.local",
  );
  expect(next.searchParams.get("status")).toBe("LIBERADA");
  expect(next.searchParams.get("saleId")).toBe("sale-context");
  expect(within(context).getByText("23 registros")).toBeTruthy();
});
it("shows receipt restriction and retains sale context on clear and pagination", async () => {
  render(
    await StockPage({
      searchParams: Promise.resolve({
        view: "receipts",
        query: "Fornecedor",
        receiptId: "receipt-context",
        saleId: "sale-context",
      }),
    }),
  );
  const context = screen.getByRole("region", {
    name: "Contexto dos resultados",
  });
  expect(context.textContent).toContain("Recebimento selecionado");
  expect(context.textContent).toContain("Busca: Fornecedor");
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  const clear = new URL(
    screen.getByRole("link", { name: "Limpar filtros" }).getAttribute("href")!,
    "https://test.local",
  );
  expect(clear.searchParams.get("saleId")).toBe("sale-context");
  expect(clear.searchParams.has("receiptId")).toBe(false);
  const next = new URL(
    screen.getByRole("link", { name: "Próxima" }).getAttribute("href")!,
    "https://test.local",
  );
  expect(next.searchParams.get("receiptId")).toBe("receipt-context");
});
