// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { RecurrencePanel } from "@/components/profitability/recurrence-panel";
import { buildRecurrence } from "@/domain/profitability/recurrence";
import {
  recurrenceCandidate,
  recurrencePopulation,
  recurrencePeriod as period,
} from "../fixtures/recurrence";
afterEach(cleanup);

it("shows fixed policy, sample and traceable human suggestion without a write action", () => {
  render(
    <RecurrencePanel value={buildRecurrence(recurrencePopulation(), period)} />,
  );
  expect(screen.getByText(/90 dias/)).toBeTruthy();
  expect(screen.getByText(/10% e R\$ 5/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Peça.*quantidade 1/ }));
  expect(screen.getByText("Conferir a ficha")).toBeTruthy();
  expect(screen.getByText(/3 de 5 pedidos independentes/)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Pedido 1" }).getAttribute("href"),
  ).toBe("/rentabilidade/sale-1");
  const first = screen.getByRole("row", { name: /Pedido 1/ });
  expect(within(first).getByText(/R\$ 5,00/)).toBeTruthy();
  fireEvent.click(within(first).getByText("Ver fontes e composição"));
  expect(within(first).getByText(/delivery-1/)).toBeTruthy();
  expect(
    screen.queryByRole("button", {
      name: /salvar|alterar ficha|confirmar revisão/i,
    }),
  ).toBeNull();
});
it("keeps pending data and tiny unreconciled residue visible outside the count", () => {
  const rows = recurrencePopulation();
  rows[0].line.actual.provisional = true;
  rows[0].line.actual.components!.material = "54.999999";
  render(<RecurrencePanel value={buildRecurrence(rows, period)} />);
  fireEvent.click(screen.getByRole("button", { name: /Peça.*quantidade 1/ }));
  expect(screen.getByText("Amostra insuficiente")).toBeTruthy();
  expect(screen.getByText(/4 de 5 linhas candidatas/)).toBeTruthy();
  expect(
    screen.getAllByText(/Custo produtivo provisório/).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText(/Conhecido de origem/).length).toBeGreaterThan(0);
});
it("paginates evidence without changing 8/12 recurrence and filters configurations by product", () => {
  const rows = Array.from({ length: 12 }, (_, i) =>
    recurrenceCandidate(i + 1, i < 8 ? "55" : "50"),
  );
  const other = recurrenceCandidate(90);
  other.line.productId = "other-product";
  other.line.description = "Outro produto";
  render(<RecurrencePanel value={buildRecurrence([...rows, other], period)} />);
  fireEvent.click(screen.getByRole("button", { name: /Peça.*quantidade 1/ }));
  expect(screen.getByText(/8 de 12 pedidos independentes/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Próximas evidências" }));
  expect(screen.getByRole("link", { name: "Pedido 12" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Pedido 1" })).toBeNull();
  expect(screen.getByText(/8 de 12 pedidos independentes/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Produto na recorrência"), {
    target: { value: "other-product" },
  });
  expect(
    screen.queryByRole("button", { name: /Peça.*quantidade 1/ }),
  ).toBeNull();
  expect(screen.getByRole("button", { name: /Outro produto/ })).toBeTruthy();
});
it("does not equate an empty population with no deviations", () => {
  render(<RecurrencePanel value={buildRecurrence([], period)} />);
  expect(screen.getByText("Sem linhas comparáveis")).toBeTruthy();
  expect(screen.getByText(/não comprova ausência de desvios/i)).toBeTruthy();
});
