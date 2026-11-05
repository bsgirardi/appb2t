// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuotePanel } from "@/components/commerce/quote-panel";
import { SalePanel } from "@/components/commerce/sale-panel";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  push.mockClear();
});
for (const [name, Panel, route] of [
  ["orçamentos", QuotePanel, "/orcamentos"],
  ["vendas", SalePanel, "/vendas"],
] as const) {
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
