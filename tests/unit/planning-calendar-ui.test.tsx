// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueueCalendar } from "@/components/planning/queue-calendar";
import { simulateQueue } from "@/domain/planning/scenario";
import { scenarioInput } from "../fixtures/planning-scenario";
import type { PlanningData } from "@/components/planning/shared";
afterEach(cleanup);
it("renders phase lanes on a shared axis and opens existing details with accessible buttons", () => {
  const input = scenarioInput(), onSelect = vi.fn();
  const data = { asOf: input.asOf, printers: [{ id: "p", name: "Máquina A" }, { id: "q", name: "Máquina vazia" }],
    batches: input.machines[0].batches, forecast: simulateQueue(input, { printerId: "p", batchIds: ["a", "b"] }).before } as unknown as PlanningData;
  render(<QueueCalendar data={data} batches={data.batches} onSelect={onSelect} />);
  const button = screen.getByRole("button", { name: /Lote 97 · Impressão/ });
  expect(button.getAttribute("title")).toContain("27/10/2026");
  fireEvent.click(button); expect(onSelect).toHaveBeenCalledWith("a");
  expect(screen.getByText("Máquina vazia")).toBeTruthy();
  expect(screen.getByRole("region", { name: "Calendário por impressora" }).tabIndex).toBe(0);
  expect(screen.getByRole("button", { name: "Semana anterior" }).hasAttribute("disabled")).toBe(true);
  for (let n = 0; n < 12; n++) fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
  expect(screen.getByRole("button", { name: "Próxima semana" }).hasAttribute("disabled")).toBe(true);
});
it("keeps unscheduled and incomplete batches outside a fictional completion date", () => {
  const input = scenarioInput(); input.machines[0].calendar = null;
  const data = { asOf: input.asOf, printers: [{ id: "p", name: "Máquina A" }], batches: input.machines[0].batches,
    forecast: simulateQueue(input, { printerId: "p", batchIds: ["a", "b"] }).before } as unknown as PlanningData;
  render(<QueueCalendar data={data} batches={data.batches} onSelect={() => {}} />);
  expect(screen.getByRole("heading", { name: "Sem previsão completa" })).toBeTruthy();
  expect(screen.getAllByText(/configure horários e dados/)).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /Lote 97 · Impressão/ })).toBeNull();
});
