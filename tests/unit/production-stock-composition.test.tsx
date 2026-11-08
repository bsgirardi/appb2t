// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ProductionPanel } from "@/components/production/production-panel";
import { StockPanel } from "@/components/stock/stock-panel";
import { ReservationAction } from "@/components/stock/reservation-form";
import {
  operationOrder,
  operationOptions,
  operationStock,
} from "../fixtures/operations";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("identifies quantities per order item without treating good pieces as delivered", () => {
  render(
    <ProductionPanel
      orders={[operationOrder]}
      finished={[]}
      options={operationOptions}
      admin={false}
      sale={null}
      view="orders"
    />,
  );
  const lines = screen.getByRole("region", {
    name: "Quantidades da ordem OP-000042",
  });
  expect(
    within(lines).getByText(operationOrder.lines[0].description),
  ).toBeTruthy();
  expect(within(lines).getByText("Meta planejada")).toBeTruthy();
  expect(within(lines).getByText("20 un")).toBeTruthy();
  expect(within(lines).getByText("Boas registradas")).toBeTruthy();
  expect(within(lines).getByText("8 un")).toBeTruthy();
  expect(within(lines).getByText("12 un")).toBeTruthy();
  expect(screen.getByText(/Peças boas não confirmam entrega/)).toBeTruthy();
});

const reservation = {
  id: "r",
  itemId: operationStock.id,
  saleId: "s",
  saleNumber: "V-42",
  name: "PLA",
  unit: "G",
  version: 1,
  saleStatus: null,
  lineKey: null,
  reserved: "1100",
  remaining: "800",
  consumed: "200",
  released: "100",
};
it("keeps units on each reservation balance and explains consumption versus release", () => {
  render(
    <StockPanel
      items={[]}
      receipts={[]}
      reservations={[reservation]}
      options={{ materials: [], extras: [] }}
      categories={[]}
      admin={false}
      view="reservations"
      initialDetail={null}
    />,
  );
  expect(screen.getByText("800 g")).toBeTruthy();
  expect(screen.getByText("200 g")).toBeTruthy();
  expect(screen.getByText("100 g")).toBeTruthy();
  expect(screen.getByText("Consumido")).toBeTruthy();
  cleanup();
  render(
    <ReservationAction
      reservation={reservation}
      item={operationStock}
      onDone={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(
    screen.getByRole("complementary", { name: "Resumo da tarefa" }).textContent,
  ).toMatch(/Consumo reduz o saldo físico/);
  fireEvent.change(screen.getByLabelText("Ação"), {
    target: { value: "RELEASE" },
  });
  expect(screen.getByRole("complementary").textContent).toMatch(
    /Liberação desfaz a reserva sem baixar material/,
  );
});

it("labels a pending receipt as physical receipt awaiting financial review", () => {
  render(
    <StockPanel
      items={[]}
      reservations={[]}
      receipts={[
        {
          id: "r",
          version: 1,
          supplier: "Fornecedor sintético",
          document: "NF-42",
          status: "PENDING",
          effectiveDate: "2026-11-07",
          total: null,
          entryIds: [],
          pendingReturns: [],
          lines: [],
        },
      ]}
      options={{ materials: [], extras: [] }}
      categories={[]}
      admin={false}
      view="receipts"
      initialDetail={null}
    />,
  );
  expect(screen.getByText(/Entrada física registrada/)).toBeTruthy();
  expect(screen.getByText(/Um administrador pode conferir/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: /Conferir e vincular/ }),
  ).toBeNull();
});
