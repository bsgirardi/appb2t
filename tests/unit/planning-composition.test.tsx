// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { PlanningPanel } from "@/components/planning/planning-panel";
import { Queue } from "@/components/planning/queue";
import type { PlanningData } from "@/components/planning/shared";
import { simulateQueue } from "@/domain/planning/scenario";
import { scenarioInput } from "../fixtures/planning-scenario";
const { api, command } = vi.hoisted(() => ({ api: vi.fn(), command: vi.fn() }));
vi.mock("@/lib/client-api", () => ({ api }));
vi.mock("@/lib/planning-client", () => ({ planningCommand: command }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function fixture() {
  const input = scenarioInput();
  return {
    asOf: input.asOf,
    revision: 4,
    role: "OPERATOR",
    warnings: [],
    issues: [],
    printers: [
      { id: "p", name: "Máquina A" },
      { id: "q", name: "Máquina B" },
    ],
    users: [],
    materials: [],
    allocations: [],
    reports: [],
    timeSummaries: [],
    suggestions: [],
    batches: input.machines.flatMap((m) => m.batches),
    forecast: simulateQueue(input, { printerId: "p", batchIds: ["a", "b"] })
      .before,
  } as unknown as PlanningData;
}
it("keeps immediate filters visible in context while collapsed and after returning from a batch", () => {
  render(<PlanningPanel initial={fixture()} />);
  const toggle = screen.getByRole("button", { name: "Filtros da fila" });
  fireEvent.click(toggle);
  fireEvent.change(screen.getByLabelText("Máquina na fila"), {
    target: { value: "p" },
  });
  fireEvent.change(screen.getByLabelText("Prazo até"), {
    target: { value: "2026-10-27" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Filtros da fila/ }));
  const context = screen.getByRole("region", { name: "Seleção da fila" });
  expect(context.textContent).toContain("Máquina A");
  expect(context.textContent).toContain("27/10/2026");
  expect(context.textContent).toContain("2 lotes");
  fireEvent.click(screen.getByRole("button", { name: "Abrir lote 97 · Azul" }));
  fireEvent.click(screen.getByRole("button", { name: "Voltar à fila" }));
  expect(
    (
      screen.getByLabelText("Máquina na fila", {
        selector: "select",
      }) as HTMLSelectElement
    ).value,
  ).toBe("p");
  expect(
    screen.getByRole("region", { name: "Seleção da fila" }).textContent,
  ).toContain("27/10/2026");
  expect(command).not.toHaveBeenCalled();
});
it("retains the displayed data and filters when refresh fails", async () => {
  api.mockRejectedValue(new Error("Falha de rede"));
  render(<PlanningPanel initial={fixture()} />);
  fireEvent.click(screen.getByRole("button", { name: /Filtros da fila/ }));
  fireEvent.change(screen.getByLabelText("Máquina na fila"), {
    target: { value: "p" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Atualizar sem apagar campos" }),
  );
  await screen.findByText("Falha de rede");
  expect(screen.getByText(/Os dados exibidos continuam/)).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Seleção da fila" }).textContent,
  ).toContain("Máquina A");
  expect(
    screen.getByRole("button", { name: "Abrir lote 97 · Azul" }),
  ).toBeTruthy();
});
it("labels staged order separately from registered forecasts without writing", async () => {
  const data = fixture();
  const input = scenarioInput();
  api.mockResolvedValue({
    ...simulateQueue(input, { printerId: "p", batchIds: ["b", "a"] }),
    asOf: input.asOf,
    revision: 4,
    expiresAt: "2026-10-27T11:01:00Z",
    fingerprint: "f",
  });
  render(
    <Queue
      data={data}
      batches={data.batches}
      onSelect={() => {}}
      onDone={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  await screen.findByText(/Sequência proposta/);
  expect(
    screen.getByText(/Previsões abaixo correspondem à fila registrada/),
  ).toBeTruthy();
  expect(screen.getAllByText(/Posição registrada:/).length).toBe(3);
  expect(command).not.toHaveBeenCalled();
});
it("explains the empty selection without inventing availability or forecasts", () => {
  const data = fixture();
  data.batches = [];
  render(
    <Queue data={data} batches={[]} onSelect={() => {}} onDone={() => {}} />,
  );
  const empty = screen.getByRole("region", { name: "Fila vazia" });
  expect(within(empty).getByText(/Revise os filtros/)).toBeTruthy();
  expect(screen.queryByText(/Retirada prevista:/)).toBeNull();
});
it("distinguishes missing availability totals from a real zero", () => {
  const data = fixture();
  data.forecast.totals = [];
  render(<PlanningPanel initial={data} />);
  expect(
    screen.getByText("Totais de disponibilidade indisponíveis nesta seleção."),
  ).toBeTruthy();
  cleanup();
  data.forecast.totals = [
    {
      printerId: "p",
      printMinutes: 0,
      serviceMinutes: 0,
      waitingMinutes: 0,
      availableMinutes: 0,
    },
  ];
  render(<PlanningPanel initial={data} />);
  expect(
    screen.queryByText(
      "Totais de disponibilidade indisponíveis nesta seleção.",
    ),
  ).toBeNull();
  const capacity = screen.getByRole("region", {
    name: "Disponibilidade e ocupação previstas",
  });
  expect(within(capacity).getAllByText("0 min")).toHaveLength(4);
});
