// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuotePanel } from "@/components/commerce/quote-panel";
import { SalePanel } from "@/components/commerce/sale-panel";
import { listCustomer, listSales } from "../fixtures/commerce-lists";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  push.mockClear();
});
it("vendas: shows the selected customer's name and retains its id when applying and paging", () => {
  render(
    <SalePanel
      initial={{ items: listSales, total: 45, page: 2, pageSize: 20 }}
      customers={[listCustomer]}
      products={[]}
      filters={{
        search: "",
        status: "realizadas",
        customerId: listCustomer.id,
      }}
    />,
  );
  const summary = screen.getByRole("region", { name: "Filtros aplicados" });
  expect(summary.textContent).toContain(`Cliente: ${listCustomer.name}`);
  expect(summary.textContent).toContain("Estado: Vendas efetivadas");
  expect(
    screen.getByRole("link", { name: "VEN-2026-100" }).getAttribute("href"),
  ).toBe("/vendas/preview-s-0");
  expect(
    screen.getByRole("table", { name: "Lista de vendas" }).textContent,
  ).toContain("123456.78");
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  let query = new URL(push.mock.calls.at(-1)![0], "http://localhost");
  expect(Object.fromEntries(query.searchParams)).toMatchObject({
    customerId: listCustomer.id,
    status: "realizadas",
    page: "3",
  });
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  query = new URL(push.mock.calls.at(-1)![0], "http://localhost");
  expect(Object.fromEntries(query.searchParams)).toMatchObject({
    customerId: listCustomer.id,
    status: "realizadas",
  });
  expect(query.searchParams.has("page")).toBe(false);
});
for (const [name, Panel, route] of [
  ["orçamentos", QuotePanel, "/orcamentos"],
  ["vendas", SalePanel, "/vendas"],
] as const) {
  it(`${name}: keeps applied criteria visible while a filter draft is edited and submits all values`, () => {
    const { container } = render(
      <Panel
        initial={{ items: [], total: 0, page: 1, pageSize: 20 }}
        customers={[]}
        products={[]}
        filters={{
          search: "Ana",
          status: "RASCUNHO",
          from: "2026-11-01",
          to: "2026-11-07",
        }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Filtros aplicados" }).textContent,
    ).toContain("Busca: Ana");
    expect(
      screen.getByRole("region", { name: "Filtros aplicados" }).textContent,
    ).toContain("Estado: Rascunho");
    const toggle = screen.getByRole("button", { name: /Filtros/ });
    fireEvent.click(toggle);
    expect(container.querySelector(".admin-required-guide")).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "Maria & Filhos" },
    });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("region", { name: "Filtros aplicados" }).textContent,
    ).toContain("Busca: Ana");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    const query = new URL(push.mock.calls.at(-1)![0], "http://localhost");
    expect(query.pathname).toBe(route);
    expect(Object.fromEntries(query.searchParams)).toMatchObject({
      search: "Maria & Filhos",
      status: "RASCUNHO",
      from: "2026-11-01",
      to: "2026-11-07",
    });
    expect(query.searchParams.has("page")).toBe(false);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Limpar filtros" })[0],
    );
    expect(push).toHaveBeenLastCalledWith(route);
  });
  it(`${name}: restores filters from navigation and preserves them when paging`, () => {
    const initial = { items: [], total: 45, page: 2, pageSize: 20 };
    const props = {
      initial,
      customers: [],
      products: [],
      filters: { search: "Ana", status: "all", from: "2026-11-01" },
    };
    const { rerender } = render(<Panel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    fireEvent.change(screen.getByLabelText("Buscar"), {
      target: { value: "não aplicado" },
    });
    rerender(<Panel {...props} filters={{ search: "Bruno", status: "all" }} />);
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe(
      "Bruno",
    );
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(push).toHaveBeenCalledWith(
      `${route}?search=Bruno&status=all&page=3`,
    );
  });
  it(`${name}: recovers a page outside results without clearing applied filters`, () => {
    render(
      <Panel
        initial={{ items: [], total: 1, page: 9, pageSize: 20 }}
        customers={[]}
        products={[]}
        filters={{ search: "Ana", status: "all" }}
      />,
    );
    expect(
      screen.getByText("Esta página está fora dos resultados."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Voltar à primeira página" }),
    );
    expect(push).toHaveBeenCalledWith(`${route}?search=Ana&status=all&page=1`);
  });
  it(`${name}: distinguishes no matches from an empty collection`, () => {
    const props = {
      initial: { items: [], total: 0, page: 1, pageSize: 20 },
      customers: [],
      products: [],
    };
    const { rerender } = render(
      <Panel {...props} filters={{ search: "Ana", status: "all" }} />,
    );
    expect(
      screen.getByText("Nenhum resultado para os filtros aplicados."),
    ).toBeTruthy();
    rerender(<Panel {...props} filters={{ search: "", status: "all" }} />);
    expect(screen.getByText(/Ainda não há/)).toBeTruthy();
  });
}
