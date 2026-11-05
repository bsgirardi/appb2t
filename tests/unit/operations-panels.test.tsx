// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductionPanel } from "@/components/production/production-panel";
import { StockPanel } from "@/components/stock/stock-panel";
import {
  operationOrder,
  operationOptions,
  operationStock,
} from "../fixtures/operations";
const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("announces loading and errors, then opens a detail without sending an operation", async () => {
  api
    .mockRejectedValueOnce(new Error("Conexão indisponível"))
    .mockResolvedValueOnce(operationOrder);
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
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir ordem OP-000042" }),
  );
  expect(screen.getByRole("status").textContent).toMatch(/Carregando/);
  expect(
    (screen.getByRole("button", { name: "Nova ordem" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await screen.findByText("Conexão indisponível");
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir ordem OP-000042" }),
  );
  await screen.findByRole("button", { name: "Voltar às ordens" });
  expect(
    screen.queryByRole("button", { name: "Corrigir apontamento" }),
  ).toBeNull();
  expect(api.mock.calls.every((call) => call.length === 1)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Voltar às ordens" }));
  await screen.findByRole("button", { name: "Abrir ordem OP-000042" });
});
it("keeps material detail separate from the list and hides administrative valuation", async () => {
  api.mockResolvedValue(operationStock);
  render(
    <StockPanel
      items={[operationStock]}
      receipts={[]}
      reservations={[]}
      options={{ materials: [], extras: [] }}
      categories={[]}
      admin={false}
      view="items"
      initialDetail={null}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Ver detalhe de PLA/ }));
  expect(
    (
      screen.getByRole("button", {
        name: "Receber compra",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await screen.findByRole("button", { name: "Fechar detalhe" });
  expect(screen.queryByRole("button", { name: /Ver detalhe de/ })).toBeNull();
  expect(screen.queryByText(/Custo unitário/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Configurar" })).toBeNull();
  expect(screen.getByText(/Disponível \(físico − reservado\)/)).toBeTruthy();
});
