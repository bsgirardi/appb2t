// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ProfitabilityReconciliation } from "@/components/profitability/reconciliation";
import { ProfitabilityDetail } from "@/components/profitability/detail";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";

afterEach(cleanup);

it("explains the three stages, signed effects and their source per line", () => {
  render(
    <ProfitabilityReconciliation value={calculateSale(completeInput())} />,
  );
  const stages = within(
    screen.getAllByRole("table", { name: "Etapas da contribuição" })[0],
  );
  expect(
    stages.getByRole("row", {
      name: /Receita da memória.*300,00.*185,00.*61,67%/,
    }),
  ).toBeTruthy();
  expect(
    stages.getByRole("row", {
      name: /Previsto na venda.*200,00.*90,00.*45,00%/,
    }),
  ).toBeTruthy();
  expect(
    stages.getByRole("row", { name: /Realizado.*200,00.*90,00.*45,00%/ }),
  ).toBeTruthy();
  expect(
    screen.getAllByRole("row", {
      name: /Preço praticado frente à memória.*− R\$ 100,00/,
    }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByRole("row", {
      name: /Efeito da receita na base das taxas.*\+ R\$ 5,00/,
    }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByText(/Memória snapshot · linha line/).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByText("Passagem comercial reconciliada.").length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByText("Passagem ao realizado reconciliada.").length,
  ).toBeGreaterThan(0);
  expect(
    screen.getByText(/não comprova um histórico de negociação/),
  ).toBeTruthy();
});

it("shows unknown dependencies and never labels incomplete results reconciled", () => {
  render(
    <ProfitabilityReconciliation value={calculateSale(profitabilityInput())} />,
  );
  expect(screen.queryByText(/Passagem comercial reconciliada/)).toBeNull();
  expect(screen.queryByText(/Passagem ao realizado reconciliada/)).toBeNull();
  expect(
    screen.getAllByText(/Memória prevista indisponível/).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText("Indisponível").length).toBeGreaterThan(0);
});

it("shows provisional and zero-revenue results without partial profit or margin", () => {
  const i = completeInput();
  i.lines[0].actual.provisional = true;
  const view = render(<ProfitabilityReconciliation value={calculateSale(i)} />);
  expect(screen.getAllByText("Provisório").length).toBeGreaterThan(0);
  expect(screen.queryByText(/Passagem ao realizado reconciliada/)).toBeNull();
  i.lines[0].actual.provisional = false;
  i.totals = { subtotal: "200", discount: "200", shipping: "0", total: "0" };
  i.administrative!.fees = { state: "DECLARED", value: "0" };
  i.administrative!.shipping = { state: "DECLARED", value: "0" };
  view.rerender(<ProfitabilityReconciliation value={calculateSale(i)} />);
  const stages = within(
    screen.getAllByRole("table", { name: "Etapas da contribuição" })[0],
  );
  const actual = within(stages.getByRole("row", { name: /^Realizado/ }));
  expect(actual.getByText("R$ -80,00")).toBeTruthy();
  expect(actual.getByText("Receita igual a zero")).toBeTruthy();
  expect(actual.queryByText(/NaN|Infinity/)).toBeNull();
  expect(
    screen.getAllByText("Passagem ao realizado reconciliada.").length,
  ).toBeGreaterThan(0);
});

it("adds the explanation to existing details using historical DTOs without changing exclusions or loss cost", () => {
  const i = completeInput();
  i.status = "CANCELADA";
  i.lines[0].actual.sources = [
    {
      id: "loss",
      label: "Perda produtiva vinculada",
      kind: "LOSS",
      value: "85",
    },
  ];
  const historical = JSON.parse(JSON.stringify(calculateSale(i)));
  render(<ProfitabilityDetail value={historical} />);
  expect(
    screen.getByRole("heading", { name: "Como a contribuição mudou" }),
  ).toBeTruthy();
  expect(screen.getByText(/Pedido fora dos indicadores normais/)).toBeTruthy();
  expect(
    screen.getByText(/Recebimentos não alteram a contribuição/),
  ).toBeTruthy();
  expect(screen.getByText(/Receita original da memória/)).toBeTruthy();
  expect(screen.getAllByText("Resultado após depreciação")).toHaveLength(2);
  const effects = screen.getAllByRole("table", {
    name: "Do previsto ao realizado",
  })[0];
  expect(within(effects).queryByText(/Perda produtiva/)).toBeNull();
  expect(within(effects).getAllByText("R$ 0,00")).toHaveLength(3);
});
