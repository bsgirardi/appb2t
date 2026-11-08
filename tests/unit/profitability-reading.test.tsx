// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  SummaryCards,
  ProfitabilityReport,
} from "@/components/profitability/report";
import { Comparison } from "@/components/profitability/detail";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { calculateSale } from "@/domain/profitability/calculate";
import { buildRankings } from "@/domain/profitability/intelligence";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
import { ProfitabilityAppliedFilters } from "@/components/profitability/applied-filters";
import {
  profitabilityReturnHref,
  profitabilitySaleHref,
} from "@/components/profitability/navigation";
afterEach(cleanup);

it("round trips report criteria and pagination while rejecting other return destinations", () => {
  const report =
    "/rentabilidade?from=2026-11-01&channelId=a%26b&page=3&lossPage=2";
  const detail = new URL(
    profitabilitySaleHref("sale/id", report),
    "https://example.test",
  );
  expect(detail.pathname).toBe("/rentabilidade/sale%2Fid");
  expect(profitabilityReturnHref(detail.searchParams.get("returnTo"))).toBe(
    report,
  );
  for (const unsafe of [
    "https://other.test",
    "//other.test",
    "/rentabilidade/other",
    "/financeiro",
    [report],
    null,
  ]) {
    expect(profitabilityReturnHref(unsafe)).toBe("/rentabilidade");
  }
});

it("describes an undated cohort without claiming date bounds and preserves selected references", () => {
  render(
    <ProfitabilityAppliedFilters
      filters={{
        undated: "true",
        from: "2026-01-01",
        productId: "p",
        channelId: "__none__",
        coverage: "PARTIAL",
      }}
      period={{ from: "2026-11-01", to: "2026-11-08" }}
      products={[{ id: "p", name: "Produto longo" }]}
      channels={[]}
    />,
  );
  const context = screen.getByRole("region", {
    name: "Critérios aplicados à rentabilidade",
  });
  expect(within(context).getByText(/período não aplicado/)).toBeTruthy();
  expect(within(context).getByText("Produto: Produto longo")).toBeTruthy();
  expect(within(context).getByText("Canal: Não informado")).toBeTruthy();
  expect(
    within(context).getByText("Cobertura realizada: Parcial"),
  ).toBeTruthy();
  expect(context.textContent).not.toContain("2026-01-01");
});

it("qualifies covered subtotals without replacing unavailable values with zero", () => {
  const rows = [
    calculateSale(completeInput()),
    calculateSale(profitabilityInput()),
  ];
  const summary = aggregateSales(rows).summary;
  summary.actual.value = "0";
  summary.afterDepreciation.value = null;
  render(<SummaryCards summary={summary} />);
  expect(
    screen.getAllByText(/Subtotal dos pedidos cobertos/).length,
  ).toBeGreaterThan(0);
  expect(screen.getByText("R$ 0,00")).toBeTruthy();
  expect(screen.getByText("Indisponível")).toBeTruthy();
});

it("distinguishes an empty page from an empty filtered population", () => {
  const rows = [calculateSale(completeInput())];
  const result = {
    ...aggregateSales(rows),
    items: [],
    total: 1,
    page: 2,
    pageSize: 20,
    rankings: buildRankings(rows, {}),
  };
  const view = render(<ProfitabilityReport result={result} />);
  expect(screen.getByText(/Nenhum pedido nesta página/)).toBeTruthy();
  expect(
    screen.queryByText(/Nenhum pedido encontrado para os filtros/),
  ).toBeNull();
  view.rerender(<ProfitabilityReport result={{ ...result, total: 0 }} />);
  expect(
    screen.getByText(/Nenhum pedido encontrado para os filtros/),
  ).toBeTruthy();
});

it("explains the difference direction and preserves missing comparison values", () => {
  const v = calculateSale(profitabilityInput());
  render(<Comparison expected={v.expected} actual={v.actual} />);
  const table = screen.getByRole("table", {
    name: "Comparação de custos e resultados",
  });
  expect(within(table).getAllByText("Indisponível").length).toBeGreaterThan(0);
  expect(screen.getByText(/Diferença = realizado menos previsto/)).toBeTruthy();
});
