// @vitest-environment jsdom
import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ProductContact } from "@/components/products/product-contact";
import { productDTO } from "../fixtures/product";
import { readInquiry, writeInquiry } from "@/lib/inquiry-store";
import { emptyProductConfiguration } from "@/domain/products/configuration";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  writeInquiry([]);
});
afterEach(cleanup);
it("keeps different personalized names as separate saved lines", () => {
  render(
    <ProductContact
      product={{
        ...productDTO,
        price: "75.00",
        commercialRevision: 1,
        configuration: {
          ...emptyProductConfiguration,
          fields: [
            {
              id: "name",
              label: "Nome",
              help: "",
              required: true,
              type: "SHORT_TEXT",
              maxLength: 120,
              effect: { kind: "ADD", amount: "5.00" },
            },
          ],
        },
      }}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: "Ana" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: "Bia" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(readInquiry()).toHaveLength(2);
  expect(readInquiry().map((i) => i.answers[0].value)).toEqual(["Ana", "Bia"]);
  expect(readInquiry()[0].seenPrice?.unit).toBe("80.00");
});
it("allows unavailable-product contact without filling required fields", () => {
  render(
    <ProductContact
      product={{
        ...productDTO,
        availability: "UNAVAILABLE",
        colors: ["Azul"],
        configuration: {
          ...emptyProductConfiguration,
          fields: [
            {
              id: "name",
              label: "Nome",
              help: "",
              required: true,
              type: "SHORT_TEXT",
              maxLength: 120,
              effect: { kind: "NONE" },
            },
          ],
        },
      }}
      phone="11999999999"
      email=""
      url="http://localhost/p"
    />,
  );
  expect(
    screen.getByRole("link", { name: "Consultar reposição" }),
  ).toBeTruthy();
});
it("lets a removed field be cleared explicitly without losing its old text", () => {
  writeInquiry([
    {
      lineId: "old",
      productId: productDTO.id,
      quantity: 1,
      answers: [{ fieldId: "removed", value: "Mensagem antiga" }],
      answerLabels: [
        { fieldId: "removed", label: "Frase", valueLabel: "Mensagem antiga" },
      ],
    },
  ]);
  render(
    <ProductContact
      product={productDTO}
      phone=""
      email=""
      url="http://localhost/p"
      editLineId="old"
    />,
  );
  expect(screen.getByText("Mensagem antiga")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Excluir resposta retirada" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
  expect(readInquiry()[0].answers).toEqual([]);
});
it("does not edit a different product through a forged line identifier", () => {
  writeInquiry([
    { lineId: "other", productId: "another-product", quantity: 1, answers: [] },
  ]);
  render(
    <ProductContact
      product={productDTO}
      phone=""
      email=""
      url="http://localhost/p"
      editLineId="other"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
  expect(readInquiry()[0].productId).toBe("another-product");
  expect(screen.getByText(/não pertence/)).toBeTruthy();
});
it("retains the catalog filters used to choose the item", () => {
  render(
    <ProductContact
      product={productDTO}
      phone=""
      email=""
      url="http://localhost/p"
      backHref="/?busca=vaso&ordem=menor-preco&pagina=2#all-products"
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(readInquiry()[0]).toHaveProperty("catalogContext", {
    collection: "",
    search: "vaso",
    order: "menor-preco",
    page: 2,
  });
});
it("requires clearing a color removed from all current options before saving", () => {
  writeInquiry([
    {
      lineId: "removed-color",
      productId: productDTO.id,
      color: "Azul",
      quantity: 1,
    },
  ]);
  render(
    <ProductContact
      product={{ ...productDTO, colors: [] }}
      phone=""
      email=""
      url="http://localhost/p"
      editLineId="removed-color"
    />,
  );
  const button = screen.getByRole("button", {
    name: "Salvar configuração",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "" } });
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  expect(readInquiry()[0].color).toBe("");
});
it("warns when adding a product can only save the list in memory", () => {
  render(
    <ProductContact
      product={productDTO}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  const original = Storage.prototype.setItem;
  const spy = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === "b2t:inquiry:v2") throw Error("quota");
      return original.call(this, key, value);
    });
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(screen.getByText(/Sua lista está apenas na memória/)).toBeTruthy();
  spy.mockRestore();
});
it("associates an excessive pasted response with its field and focuses it", () => {
  render(
    <ProductContact
      product={{
        ...productDTO,
        configuration: {
          ...emptyProductConfiguration,
          fields: [
            {
              id: "paste",
              label: "Frase",
              help: "",
              required: true,
              type: "SHORT_TEXT",
              maxLength: 120,
              effect: { kind: "NONE" },
            },
          ],
        },
      }}
      phone=""
      email=""
      url="http://localhost/p"
    />,
  );
  const input = screen.getByLabelText(/Frase/);
  fireEvent.change(input, { target: { value: "x".repeat(501) } });
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(readInquiry()).toEqual([]);
});
