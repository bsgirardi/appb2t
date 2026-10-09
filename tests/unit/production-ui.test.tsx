// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReportForm } from "@/components/production/report-form";
import type {
  OrderDetail,
  ProductionOptions,
} from "@/server/production/queries";
const command = vi.hoisted(() => vi.fn());
vi.mock("@/lib/production-client", () => ({ productionCommand: command }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const order: OrderDetail = {
  id: "o",
  sequence: 1,
  origin: "STOCK",
  saleId: null,
  status: "LIBERADA",
  version: 2,
  responsibleId: "u",
  dueDate: null,
  notes: "",
  lines: [
    {
      id: "l",
      productId: "p",
      saleLineKey: null,
      description: "Peça",
      technology: "FDM",
      targetUnits: 5,
      goodUnits: 2,
      failedUnits: 0,
      canceledUnits: 0,
      plannedPrinterId: null,
    },
  ],
  events: [],
  allocations: [],
  origins: [],
  saleReservations: [],
  previousConsumptions: [],
};
const options: ProductionOptions = {
  products: [{ id: "p", name: "Peça" }],
  users: [{ id: "u", name: "Operador" }],
  printers: [],
  materials: [],
  sales: [],
};
it("keeps incremental report values and retry key after a network error without exposing costs", async () => {
  command.mockRejectedValue(new Error("Falha de rede"));
  render(
    <ReportForm
      order={order}
      options={options}
      onDone={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(screen.queryByText(/custo por/i)).toBeNull();
  expect(screen.getByText(/já produzidas: 2/i)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Peças boas neste apontamento"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByLabelText("Etapa manual"));
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Confirmar apontamento" })
      .closest("form")!,
  );
  await screen.findByText("Falha de rede");
  const first = command.mock.calls[0][1].operationKey;
  expect(
    (screen.getByLabelText("Peças boas neste apontamento") as HTMLInputElement)
      .value,
  ).toBe("1");
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Confirmar apontamento" })
      .closest("form")!,
  );
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command.mock.calls[1][1].operationKey).toBe(first);
  expect(command.mock.calls[1][1]).toMatchObject({
    goodUnits: 1,
    machineMinutes: null,
    timeComplete: false,
  });
});

it("replays the original report after an ambiguous response even when balances refresh", async () => {
  const { ApiError } = await import("@/lib/client-api");
  command
    .mockRejectedValueOnce(new ApiError("Resposta perdida", "NETWORK"))
    .mockResolvedValueOnce({});
  const view = render(
    <ReportForm
      order={order}
      options={options}
      onDone={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Peças boas neste apontamento"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByLabelText("Etapa manual"));
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Confirmar apontamento" })
      .closest("form")!,
  );
  await screen.findByText("Resposta perdida");
  const original = command.mock.calls[0][1];
  view.rerender(
    <ReportForm
      order={{
        ...order,
        version: 3,
        lines: order.lines.map((l) => ({ ...l, goodUnits: 3 })),
      }}
      options={options}
      onDone={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Confirmar apontamento" })
      .closest("form")!,
  );
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command.mock.calls[1][1]).toEqual(original);
});
