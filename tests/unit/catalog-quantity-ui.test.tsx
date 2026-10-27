// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { ProductContact } from "@/components/products/product-contact";
import { InquiryPanel } from "@/components/products/inquiry-panel";
import { KitBuilder } from "@/components/kits/kit-builder";
import { productDTO } from "../fixtures/product";
import {
  readInquiry,
  writeInquiry,
  resetInquiry,
  writeKitSelection,
  readKitSelection,
} from "@/lib/inquiry-store";
import {
  clearConfigurationDraft,
  writeConfigurationDraft,
} from "@/lib/product-configuration-draft";
import { emptyProductConfiguration } from "@/domain/products/configuration";
import { parseKitSelection } from "@/domain/kits/selection";
import { api } from "@/lib/client-api";
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  resetInquiry();
  clearConfigurationDraft(`${productDTO.id}:new`);
});
afterEach(cleanup);
it("starts a new configuration at its product minimum", () => {
  render(
    <ProductContact
      product={{ ...productDTO, minimumQuantity: 5 }}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  expect(
    (screen.getByLabelText("Quantidade para orçamento") as HTMLInputElement)
      .value,
  ).toBe("5");
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(readInquiry()[0].quantity).toBe(5);
});
it("preserves a stale draft below the new minimum and its personalization until explicitly fixed", () => {
  const configuration = {
    ...emptyProductConfiguration,
    fields: [
      {
        id: "name",
        label: "Nome",
        help: "",
        required: true,
        type: "SHORT_TEXT" as const,
        maxLength: 120,
        effect: { kind: "NONE" as const },
      },
    ],
  };
  writeConfigurationDraft(`${productDTO.id}:new`, {
    productId: productDTO.id,
    quantity: 3,
    answers: [{ fieldId: "name", value: "Ana" }],
  });
  render(
    <ProductContact
      product={{ ...productDTO, minimumQuantity: 5, configuration }}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  const input = screen.getByLabelText(
    "Quantidade para orçamento",
  ) as HTMLInputElement;
  const save = screen.getByRole("button", {
    name: "Adicionar à lista de orçamento",
  }) as HTMLButtonElement;
  expect(input.value).toBe("3");
  expect(save.disabled).toBe(true);
  expect((screen.getByLabelText(/Nome/) as HTMLInputElement).value).toBe("Ana");
  fireEvent.change(input, { target: { value: "6" } });
  expect(save.disabled).toBe(false);
  fireEvent.click(save);
  expect(readInquiry()[0]).toMatchObject({
    quantity: 6,
    answers: [{ fieldId: "name", value: "Ana" }],
  });
});
it("accepts 100 units and blocks confirmation while the quantity is blank", () => {
  render(
    <ProductContact
      product={productDTO}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  const input = screen.getByLabelText(
    "Quantidade para orçamento",
  ) as HTMLInputElement;
  const save = screen.getByRole("button", {
    name: "Adicionar à lista de orçamento",
  }) as HTMLButtonElement;
  fireEvent.change(input, { target: { value: "100" } });
  expect(save.disabled).toBe(false);
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  expect(save.disabled).toBe(true);
  expect(readInquiry()).toHaveLength(0);
  fireEvent.change(input, { target: { value: "100" } });
  fireEvent.click(save);
  expect(readInquiry()[0].quantity).toBe(100);
});
it("edits a saved list to 100 units without generating options and blocks an empty quantity", async () => {
  writeInquiry([{ lineId: "line", productId: productDTO.id, quantity: 5 }]);
  vi.mocked(api).mockResolvedValue({
    lines: [
      {
        ...readInquiry()[0],
        minimumQuantity: 5,
        name: "Vaso",
        sku: "",
        path: null,
        imageUrl: null,
        price: "20.00",
        subtotal: "100.00",
        problem: null,
      },
    ],
    total: "100.00",
    ready: false,
    message: "",
    contact: null,
    channel: null,
  });
  render(<InquiryPanel />);
  const input = await screen.findByLabelText("Quantidade de Vaso, item 1");
  expect(input.tagName).toBe("INPUT");
  fireEvent.change(input, { target: { value: "" } });
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Conferir e preparar contato",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
  expect(readInquiry()[0].quantity).toBe(5);
  fireEvent.change(input, { target: { value: "100" } });
  expect(readInquiry()[0].quantity).toBe(100);
});
it("edits kit components with large quantities and enforces each product minimum", () => {
  const kit = {
    id: "k",
    name: "Kit",
    description: "",
    active: true,
    position: 0,
    version: 1,
    commercialRevision: 1,
    productIds: [productDTO.id],
    tiers: [],
  };
  writeKitSelection(
    parseKitSelection({
      schemaVersion: 2,
      items: [
        {
          lineId: "line",
          productId: productDTO.id,
          quantity: 5,
          kitInstanceId: "g",
        },
      ],
      groups: [
        {
          instanceId: "g",
          kitId: "k",
          commercialRevision: 1,
          seenPrice: null,
          placements: [{ lineId: "line", x: 0.5, y: 0.5, z: 0 }],
        },
      ],
    }),
  );
  render(
    <KitBuilder kit={kit} products={[{ ...productDTO, minimumQuantity: 5 }]} />,
  );
  const input = screen.getByLabelText(`Quantidade de ${productDTO.name}`);
  expect(input.tagName).toBe("INPUT");
  fireEvent.change(input, { target: { value: "3" } });
  expect(readKitSelection().items[0].quantity).toBe(5);
  expect(
    (
      screen.getByRole("button", {
        name: "Revisar conjunto",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(input, { target: { value: "100" } });
  expect(readKitSelection().items[0].quantity).toBe(100);
});
it("blocks a pending merge when its local quantity is blank", () => {
  writeInquiry([
    { lineId: "editing", productId: productDTO.id, quantity: 5, color: "azul" },
    {
      lineId: "other",
      productId: productDTO.id,
      quantity: 6,
      commercialRevision: 1,
    },
  ]);
  writeConfigurationDraft(`${productDTO.id}:editing`, {
    productId: productDTO.id,
    quantity: 5,
    color: "",
  });
  render(
    <ProductContact
      product={productDTO}
      editLineId="editing"
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
  const confirm = screen.getByRole("button", {
    name: "Confirmar e combinar",
  }) as HTMLButtonElement;
  fireEvent.change(screen.getByLabelText("Quantidade para orçamento"), {
    target: { value: "" },
  });
  expect(confirm.disabled).toBe(true);
  fireEvent.click(confirm);
  expect(readInquiry()).toHaveLength(2);
});
it("preserves contact while a list quantity is cleared and retyped", async () => {
  writeInquiry([{ lineId: "line", productId: productDTO.id, quantity: 5 }]);
  vi.mocked(api).mockResolvedValue({
    lines: [
      {
        ...readInquiry()[0],
        name: "Vaso",
        sku: "",
        path: null,
        imageUrl: null,
        price: "20.00",
        subtotal: "100.00",
        problem: null,
      },
    ],
    total: "100.00",
    ready: true,
    message: "",
    contact: null,
    channel: null,
  });
  render(<InquiryPanel />);
  const input = await screen.findByLabelText("Quantidade de Vaso, item 1");
  const name = screen.getByLabelText(/Seu nome/i) as HTMLInputElement;
  fireEvent.change(name, { target: { value: "Ana" } });
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.change(input, { target: { value: "100" } });
  expect((screen.getByLabelText(/Seu nome/i) as HTMLInputElement).value).toBe(
    "Ana",
  );
});
