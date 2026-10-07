// @vitest-environment jsdom
import { expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StockSummary } from "@/components/stock/shared";
import { ReceiptForm } from "@/components/stock/receipt-form";
import type { StockItemDTO } from "@/server/stock/queries";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const item = {
  id: "i",
  name: "PLA",
  unit: "G",
  inventoriedAt: null,
  physical: "0",
  reserved: "0",
  available: "0",
  shortage: "0",
  active: true,
  version: 1,
  identities: [],
  movements: [],
  materialId: null,
  extraId: null,
} as unknown as StockItemDTO;
it("distinguishes unknown initial stock from counted zero", () => {
  render(<StockSummary item={item} />);
  expect(screen.getByText("Não inventariado")).toBeTruthy();
  cleanup();
  render(
    <StockSummary
      item={{ ...item, inventoriedAt: new Date().toISOString() }}
    />,
  );
  expect(screen.queryByText("Não inventariado")).toBeNull();
  expect(screen.getByText(/Disponível/)).toBeTruthy();
});
it("physical receipt has no financial inputs and preserves draft and key after network error", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("Falha de rede"))
    .mockResolvedValue({});
  render(
    <ReceiptForm
      items={[{ ...item, inventoriedAt: new Date().toISOString() }]}
      onDone={() => {}}
      send={send}
    />,
  );
  expect(screen.queryByLabelText(/Valor|Parcelas|Custo/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Fornecedor"), {
    target: { value: "Fornecedor A" },
  });
  fireEvent.change(screen.getByLabelText("Item 1"), { target: { value: "i" } });
  fireEvent.change(screen.getByLabelText("Quantidade 1"), {
    target: { value: "500" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar recebimento físico" }),
  );
  await screen.findByText("Falha de rede");
  expect((screen.getByLabelText("Fornecedor") as HTMLInputElement).value).toBe(
    "Fornecedor A",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar recebimento físico" }),
  );
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls[0][1].operationKey).toBe(
    send.mock.calls[1][1].operationKey,
  );
});
import { ActionForm } from "@/components/finance/shared";
it("keeps draft while refreshing version and creates a new submission key", async () => {
  const send = vi.fn().mockRejectedValue(new Error("Registro alterado"));
  const renderForm = (revision: number) => (
    <ActionForm
      revision={revision}
      title="Movimentar"
      onSubmit={send}
      onDone={() => {}}
    >
      <label>
        Quantidade
        <input name="quantity" defaultValue="20" />
      </label>
    </ActionForm>
  );
  const result = render(renderForm(1));
  fireEvent.change(screen.getByLabelText("Quantidade"), {
    target: { value: "30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByText("Registro alterado");
  result.rerender(renderForm(2));
  expect((screen.getByLabelText("Quantidade") as HTMLInputElement).value).toBe(
    "30",
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls[0][1]).not.toBe(send.mock.calls[1][1]);
});
import { ReceiptFinance } from "@/components/stock/receipt-finance";
import * as clientApi from "@/lib/client-api";
import type { StockReceiptDTO } from "@/server/stock/queries";
it("retains all selected payable installments across pages", async () => {
  const receipt = {
    id: "r",
    supplier: "Fornecedor",
    total:null,
    entryIds:[],
    document: "",
    status: "PENDING",
    version: 1,
    effectiveDate: "2026-10-07",
    lines: [{ id: "l", itemId: "i", name: "PLA", unit: "G", quantity: "100",confirmedValue:null }],
    pendingReturns: [],
  } as StockReceiptDTO;
  const request = vi
    .spyOn(clientApi, "api")
    .mockImplementation(async (url, body) => {
      if (body) return {};
      const second = url.includes("page=2&");
      return {
        total: 101,
        items: [
          {
            id: second ? "entry2" : "entry1",
            description: second ? "Parcela dois" : "Parcela um",
            amount: second ? "20.00" : "10.00",
            dueDate: "2026-10-07",
            state: "ABERTO",
            canceledAt: null,
            receiptId: null,
          },
        ],
      };
    });
  render(
    <ReceiptFinance
      receipt={receipt}
      categories={[]}
      onDone={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Destino financeiro"), {
    target: { value: "LINK" },
  });
  fireEvent.click(await screen.findByLabelText(/Parcela um/));
  fireEvent.click(screen.getByRole("button", { name: "Próximas" }));
  fireEvent.click(await screen.findByLabelText(/Parcela dois/));
  fireEvent.change(screen.getByLabelText(/PLA.*valor total/), {
    target: { value: "30" },
  });
  fireEvent.change(screen.getByLabelText("Total da compra (R$)"), {
    target: { value: "30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await vi.waitFor(() =>
    expect(request.mock.calls.some((c) => c[0] === "/api/stock/commands")).toBe(
      true,
    ),
  );
  expect(
    request.mock.calls.find((c) => c[0] === "/api/stock/commands")?.[1],
  ).toMatchObject({ payload: { entryIds: ["entry1", "entry2"] } });
});
