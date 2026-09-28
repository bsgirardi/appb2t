// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProductForm } from "@/components/products/product-form";
import { calculatorData, productDTO } from "../fixtures/product";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("edits saved calculator fields and recalculates price", () => {
  render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="OPERATOR"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(screen.getByText("R$ 48,19")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Acréscimo sobre o custo"), {
    target: { value: "0" },
  });
  expect(
    screen.getByText("R$ 16,06", { selector: ".sale-price" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Valor de aquisição")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Horas"), { target: { value: "" } });
  expect(screen.getByText("R$ —")).toBeTruthy();
});
it("preserves a draft and prevents duplicate submission during a failed save", async () => {
  let resolve!: (r: Response) => void;
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="ADMIN"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome do produto"), {
    target: { value: "Rascunho" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(
    (screen.getByRole("button", { name: /Salvando/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  resolve(
    new Response(
      JSON.stringify({
        error: { code: "CONFLICT", message: "Atualize antes de salvar" },
      }),
      { status: 409 },
    ),
  );
  await screen.findByText("Atualize antes de salvar");
  expect(
    (screen.getByLabelText("Nome do produto") as HTMLInputElement).value,
  ).toBe("Rascunho");
});
it("loads current settings into draft only and keeps snapshot for inactive references", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ...calculatorData, materials: [] } }),
      ),
    );
  render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="ADMIN"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Carregar configurações atuais" }),
  );
  await screen.findByText(/Selecione material e impressora ativos/);
  expect(screen.getByText("R$ 48,19")).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("copies compatible selections and reports missing setup", () => {
  const view = render(
    <ProductForm
      data={calculatorData}
      role="OPERATOR"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Material de referência"), {
    target: { value: "m" },
  });
  expect(
    (screen.getByLabelText("Preço do material") as HTMLInputElement).value,
  ).toBe("100");
  fireEvent.change(screen.getByLabelText("Impressora de referência"), {
    target: { value: "p" },
  });
  expect((screen.getByLabelText("Potência") as HTMLInputElement).value).toBe(
    "100",
  );
  view.unmount();
  render(
    <ProductForm
      data={{ ...calculatorData, settings: null }}
      role="OPERATOR"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(screen.getByText(/administrador/)).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Salvar produto",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
