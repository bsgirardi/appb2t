// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntelligencePanel } from "@/components/profitability/intelligence-panel";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { buildRankings } from "@/domain/profitability/intelligence";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
afterEach(cleanup);
const period = {
  from: "2026-10-01",
  to: "2026-10-10",
  today: "2026-11-04",
  enabled: true,
};
it("labels undated cohorts and preserves a monthly goal when projection is blocked", () => {
  const rows = [calculateSale(completeInput())];
  const props = {
    summary: aggregateSales(rows).summary,
    rankings: buildRankings(rows, {}),
  };
  const view = render(
    <IntelligencePanel {...props} period={{ ...period, to: "2026-11-30" }} />,
  );
  fireEvent.change(screen.getByLabelText("Meta no período"), {
    target: { value: "400" },
  });
  expect(screen.getByText(/50,00%/)).toBeTruthy();
  expect(screen.getByText(/Para extrapolar/)).toBeTruthy();
  view.rerender(
    <IntelligencePanel
      {...props}
      period={{ ...period, undated: true, enabled: false }}
    />,
  );
  expect(screen.getByText(/Base sem data de confirmação/)).toBeTruthy();
  expect(screen.queryByText(/Base de confirmação:/)).toBeNull();
});
it("shows source links and a transient goal with explainable projection", () => {
  const rows = [calculateSale(completeInput())];
  render(
    <IntelligencePanel
      summary={aggregateSales(rows).summary}
      rankings={buildRankings(rows, {})}
      period={period}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ranking por produto" }));
  fireEvent.click(screen.getByText("Ver pedidos de origem"));
  expect(
    screen.getAllByRole("link", { name: "Pedido 1" })[0].getAttribute("href"),
  ).toBe("/rentabilidade/sale");
  fireEvent.change(screen.getByLabelText("Meta no período"), {
    target: { value: "400" },
  });
  expect(screen.getByText(/50,00%/)).toBeTruthy();
  expect(screen.getByText(/10 dias corridos/)).toBeTruthy();
  expect(screen.getByText(/Não cria vendas/)).toBeTruthy();
});
it("does not show incomplete contribution as goal progress", () => {
  const rows = [calculateSale(profitabilityInput())];
  render(
    <IntelligencePanel
      summary={aggregateSales(rows).summary}
      rankings={buildRankings(rows, {})}
      period={period}
    />,
  );
  fireEvent.change(screen.getByLabelText("Indicador da meta"), {
    target: { value: "contribution" },
  });
  fireEvent.change(screen.getByLabelText("Meta no período"), {
    target: { value: "100" },
  });
  expect(screen.getByText(/Realizado indisponível/)).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ranking por produto" }));
  expect(screen.getAllByText("Sem posição").length).toBeGreaterThan(0);
});
