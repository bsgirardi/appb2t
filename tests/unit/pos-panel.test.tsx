// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { PosPanel } from "@/components/pos/pos-panel";
import {
  emptyPosDraft,
  type PosOrderDTO,
  type PosProduct,
} from "@/domain/pos/types";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/client-api", () => ({ api }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const order: PosOrderDTO = {
  id: "order",
  version: 1,
  input: emptyPosDraft,
  updatedAt: "2026-11-06T12:00:00Z",
  receipt: null,
};
const product: PosProduct = {
  id: "p",
  name: "Peça simples",
  sku: "P01",
  price: "19.90",
  commercialRevision: 1,
  minimumQuantity: 1,
  quantityTiers: [{ minQuantity: 2, baseUnitPrice: "18.00" }],
  available: 3,
  reason: null,
};
it("orienta a compra vazia e distingue indisponibilidade no catálogo", () => {
  render(
    <PosPanel
      initialOrder={order}
      initialProducts={[
        { ...product, available: 0, reason: "Sem peças livres." },
      ]}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Produtos para atendimento" }),
  ).not.toBeNull();
  expect(
    screen.getByRole("heading", { name: "Itens da compra" }),
  ).not.toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Indisponível: Peça simples" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(
    screen.getByText("Adicione pelo menos uma peça para revisar a venda."),
  ).not.toBeNull();
  expect(
    within(screen.getByRole("group", { name: "Cliente (opcional)" }))
      .getByRole("radio", { name: "Sem identificar" })
      .getAttribute("aria-checked"),
  ).toBe("true");
});
it("identifica processamento e bloqueia repetição ao salvar o rascunho", async () => {
  let resolve!: (value: PosOrderDTO) => void;
  api.mockReturnValueOnce(
    new Promise<PosOrderDTO>((done) => {
      resolve = done;
    }),
  );
  render(<PosPanel initialOrder={order} initialProducts={[product]} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar Peça simples" }),
  );
  const save = screen.getByRole("button", {
    name: "Salvar compra para depois",
  });
  fireEvent.click(save);
  expect(screen.getByRole("status").textContent).toContain(
    "Processando solicitação. Aguarde antes de continuar.",
  );
  fireEvent.click(save);
  expect(api).toHaveBeenCalledTimes(1);
  expect(save.hasAttribute("disabled")).toBe(true);
  resolve({
    ...order,
    version: 2,
    input: {
      ...emptyPosDraft,
      items: [
        {
          productId: "p",
          quantity: 1,
          unitPrice: "19.90",
          commercialRevision: 1,
        },
      ],
    },
  });
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("Compra salva."),
  );
});
it("atende sem identificação obrigatória e aplica faixa ao ajustar quantidade", () => {
  render(<PosPanel initialOrder={order} initialProducts={[product]} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar Peça simples" }),
  );
  expect(
    (screen.getByLabelText("Quantidade de Peça simples") as HTMLInputElement)
      .value,
  ).toBe("1");
  fireEvent.change(screen.getByLabelText("Quantidade de Peça simples"), {
    target: { value: "2" },
  });
  expect(screen.getAllByText(/36,00/).length).toBeGreaterThan(0);
  expect(
    screen
      .getByRole("radio", { name: "Sem identificar" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("radio", { name: "Cadastrar" }));
  expect(screen.getByLabelText("Nome do cliente")).not.toBeNull();
});
it("mantém cliente cadastrado na revisão e permite retornar à venda sem identificação", () => {
  const input = {
    ...emptyPosDraft,
    customerId: "cliente",
    customerVersion: 3,
    customerName: "Cliente sintético",
    items: [
      {
        productId: "p",
        quantity: 1,
        unitPrice: "19.90",
        commercialRevision: 1,
      },
    ],
  };
  render(
    <PosPanel initialOrder={{ ...order, input }} initialProducts={[product]} />,
  );
  expect(
    (screen.getByLabelText("Cliente cadastrado") as HTMLSelectElement).value,
  ).toBe("cliente");
  fireEvent.click(screen.getByRole("button", { name: "Revisar venda" }));
  expect(screen.getByText(/Cliente: Cliente sintético/)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Voltar à compra" }));
  fireEvent.click(screen.getByRole("radio", { name: "Sem identificar" }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar venda" }));
  expect(screen.getByText(/Consumidor não identificado/)).not.toBeNull();
  expect(api).not.toHaveBeenCalled();
});
it("erro de consulta recebe foco sem descartar a compra", async () => {
  api.mockRejectedValueOnce(
    new Error("Consulta indisponível. Tente novamente."),
  );
  render(<PosPanel initialOrder={order} initialProducts={[product]} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar Peça simples" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  await screen.findByText("Consulta indisponível. Tente novamente.");
  expect(document.activeElement).toBe(screen.getByRole("alert"));
  expect(
    (screen.getByLabelText("Quantidade de Peça simples") as HTMLInputElement)
      .value,
  ).toBe("1");
  expect(
    screen
      .getByRole("button", { name: "Revisar venda" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
it("aceita atualização explícita dos valores do carrinho e exige nova revisão", async () => {
  const input = {
    ...emptyPosDraft,
    items: [
      {
        productId: "p",
        quantity: 1,
        unitPrice: "19.90",
        commercialRevision: 1,
      },
    ],
  };
  api.mockResolvedValueOnce([
    { ...product, price: "25.00", commercialRevision: 2 },
  ]);
  render(
    <PosPanel initialOrder={{ ...order, input }} initialProducts={[product]} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Atualizar itens da compra" }),
  );
  await waitFor(() =>
    expect(screen.getAllByText(/25,00/).length).toBeGreaterThan(0),
  );
  expect(screen.getByRole("button", { name: "Revisar venda" })).not.toBeNull();
});
it("resposta perdida bloqueia nova conclusão até consultar a mesma compra", async () => {
  const input = {
    ...emptyPosDraft,
    items: [
      {
        productId: "p",
        quantity: 1,
        unitPrice: "19.90",
        commercialRevision: 1,
      },
    ],
  };
  api.mockRejectedValueOnce(new Error("Resposta perdida"));
  render(
    <PosPanel initialOrder={{ ...order, input }} initialProducts={[product]} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Revisar venda" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Concluir venda e entregar" }),
  );
  await screen.findByText(/Resposta perdida/);
  expect(api).toHaveBeenCalledWith("/api/pos/order/complete", {
    expectedVersion: 1,
  });
  expect(screen.queryByRole("button", { name: "Nova venda" })).toBeNull();
  const receipt = {
    saleId: "sale",
    number: "VEN-000001",
    status: "ENTREGUE",
    total: "19.90",
    customerName: "Consumidor não identificado",
    payment: { method: "PIX" as const, tendered: null, change: "0.00" },
    received: "0.00",
    pending: "19.90",
  };
  api.mockResolvedValueOnce({ ...order, input, receipt });
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar esta compra" }),
  );
  await waitFor(() => expect(screen.getByText(/VEN-000001/)).not.toBeNull());
  expect(api).toHaveBeenLastCalledWith("/api/pos/order");
  expect(screen.getByText(/Recebimento a conferir/)).not.toBeNull();
});
it("recuperação de outra edição exige escolha antes de sobrescrever o rascunho", async () => {
  const input = {
    ...emptyPosDraft,
    items: [
      {
        productId: "p",
        quantity: 1,
        unitPrice: "19.90",
        commercialRevision: 1,
      },
    ],
  };
  api.mockRejectedValueOnce(new Error("Conflito de edição"));
  render(
    <PosPanel initialOrder={{ ...order, input }} initialProducts={[product]} />,
  );
  fireEvent.change(screen.getByLabelText("Desconto na compra (R$)"), {
    target: { value: "1.00" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar compra para depois" }),
  );
  await screen.findByText("Conflito de edição");
  api.mockResolvedValueOnce({
    ...order,
    version: 3,
    input: {
      ...input,
      items: [{ ...input.items[0], quantity: 2, unitPrice: "18.00" }],
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar esta compra" }),
  );
  await screen.findByRole("button", { name: "Usar compra salva" });
  expect(
    (screen.getByRole("button", { name: "Revisar venda" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Usar compra salva" }));
  expect(
    (screen.getByLabelText("Quantidade de Peça simples") as HTMLInputElement)
      .value,
  ).toBe("2");
});
