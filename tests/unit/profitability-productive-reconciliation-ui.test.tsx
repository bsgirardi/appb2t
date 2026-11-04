// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ProductiveCostReconciliation } from "@/components/profitability/productive-reconciliation";
import { ProfitabilityReconciliation } from "@/components/profitability/reconciliation";
import { calculateSale } from "@/domain/profitability/calculate";
import { productiveInput } from "../fixtures/productive-reconciliation";
afterEach(cleanup);
it("shows expected, attributed actual and signed effects with traceable sources", () => {
  const value = calculateSale(productiveInput());
  render(
    <ProductiveCostReconciliation
      line={value.lines[0]}
      administrative={value.administrative}
    />,
  );
  const table = within(
    screen.getByRole("table", { name: "Composição da variação produtiva" }),
  );
  expect(
    table.getByRole("row", {
      name: /Material.*50,00.*60,00.*− R\$ 10,00.*snapshot.*line/,
    }),
  ).toBeTruthy();
  expect(
    table.getByRole("row", { name: /Trabalho.*20,00.*24,00.*− R\$ 4,00/ }),
  ).toBeTruthy();
  expect(
    table.getByRole("row", {
      name: /Extras e complementos.*10,00.*10,00.*complement/,
    }),
  ).toBeTruthy();
  expect(
    screen.getByText(
      /Custo adicional nesta abertura: zero; custos efetivos já incluídos nos componentes/,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(/O custo causal das falhas não foi medido separadamente/),
  ).toBeTruthy();
  expect(screen.getByText(/delivery/)).toBeTruthy();
  expect(screen.getByText("Abertura produtiva reconciliada.")).toBeTruthy();
  expect(screen.queryByText(/economia com falhas/i)).toBeNull();
});
it("keeps the aggregate bridge complete when historical detail is unavailable", () => {
  const input = productiveInput();
  delete input.lines[0].expected!.components;
  render(<ProfitabilityReconciliation value={calculateSale(input)} />);
  expect(
    screen.getAllByText("Passagem ao realizado reconciliada.").length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText("Abertura produtiva reconciliada.")).toBeNull();
  expect(
    screen.getAllByText(/Composição prevista indisponível na memória/).length,
  ).toBeGreaterThan(0);
});
it("identifies losses already included and shows tiny unresolved amounts", () => {
  const input = productiveInput();
  input.lines[0].actual.sources.push({
    id: "loss-30",
    kind: "LOSS",
    label: "Perda produtiva vinculada",
    value: "30",
  });
  input.lines[0].actual.total = "100.000001";
  const value = calculateSale(input);
  render(
    <ProductiveCostReconciliation
      line={value.lines[0]}
      administrative={value.administrative}
    />,
  );
  expect(screen.getByText(/Perdas já incluídas/)).toBeTruthy();
  expect(screen.getAllByText(/loss-30.*30,00/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/inclui depreciação/).length).toBeGreaterThan(0);
  expect(screen.getByText(/-0,000001/)).toBeTruthy();
  expect(screen.queryByText("Abertura produtiva reconciliada.")).toBeNull();
});
it("displays known amounts as provisional rather than complete effects", () => {
  const input = productiveInput();
  input.lines[0].actual.provisional = true;
  const value = calculateSale(input);
  render(
    <ProductiveCostReconciliation
      line={value.lines[0]}
      administrative={value.administrative}
    />,
  );
  expect(screen.getAllByText(/Conhecido: R\$ 60,00/).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Provisório").length).toBeGreaterThan(0);
  expect(screen.queryByText("Abertura produtiva reconciliada.")).toBeNull();
});
