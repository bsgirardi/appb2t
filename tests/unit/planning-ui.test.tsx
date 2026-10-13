// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BatchForm } from "@/components/planning/batch-form";
import { Queue } from "@/components/planning/queue";
import type { PlanningData } from "@/components/planning/shared";
import type { BatchDTO } from "@/domain/planning/types";
const command = vi.hoisted(() => vi.fn());
vi.mock("@/lib/planning-client", () => ({ planningCommand: command }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const data = {
  revision: 4,
  printers: [
    {
      id: "p",
      name: "Máquina",
      active: true,
      settings: { prepareMinutes: "5", removeMinutes: "10" },
    },
  ],
  materials: [
    { id: "m", name: "PLA", unit: "G", active: true, inventoried: true },
  ],
  lines: [
    {
      id: "l",
      printerId: "p",
      description: "Peça",
      orderSequence: 1,
      freeUnits: 10,
    },
  ],
  forecast: { batches: [] },
} as unknown as PlanningData;
it("keeps draft values and retry identity after an error and requires explicit confirmations", async () => {
  command.mockRejectedValue(new Error("Conflito: atualize os saldos."));
  render(<BatchForm data={data} onDone={() => {}} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText("Cor declarada"), {
    target: { value: "Azul" },
  });
  fireEvent.change(screen.getByLabelText("Peças — OP 1 · Peça"), {
    target: { value: "5" },
  });
  expect(
    (screen.getByLabelText("Tempo confirmado no fatiador") as HTMLInputElement)
      .checked,
  ).toBe(false);
  const form = screen
    .getByRole("button", { name: "Salvar lote" })
    .closest("form")!;
  fireEvent.submit(form);
  await screen.findByText("Conflito: atualize os saldos.");
  expect(
    (screen.getByLabelText("Cor declarada") as HTMLInputElement).value,
  ).toBe("Azul");
  const first = command.mock.calls[0][1];
  fireEvent.submit(form);
  await screen.findByText("Conflito: atualize os saldos.");
  expect(command.mock.calls[1][1]).toEqual(first);
  expect(first.participants).toEqual([{ lineId: "l", units: 5 }]);
});
it("shows blocked forecasts, pending reconciliation and keyboard-accessible queue movement", () => {
  const batch = {
    id: "a",
    printerId: "p",
    sequence: 1,
    state: "PENDING",
    position: 1,
    colorLabel: "Azul",
    blockers: ["Reserva insuficiente para o lote"],
    participants: [
      {
        units: 5,
        settledUnits: 0,
        description: "Peça",
        orderSequence: 1,
        dueDate: null,
      },
    ],
  } as BatchDTO;
  render(
    <Queue
      data={data}
      batches={[batch, { ...batch, id: "b", sequence: 2, position: 2 }]}
      onSelect={() => {}}
      onDone={() => {}}
    />,
  );
  expect(screen.getAllByText("Reserva insuficiente para o lote")).toHaveLength(
    2,
  );
  expect(screen.getAllByText(/Previsão indisponível/)).toHaveLength(2);
  expect(
    screen
      .getByRole("button", { name: "Subir lote 2" })
      .getAttribute("disabled"),
  ).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Descer lote 1" })
      .getAttribute("disabled"),
  ).toBeNull();
});
