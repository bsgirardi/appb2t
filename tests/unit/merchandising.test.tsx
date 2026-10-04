// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { productSchema } from "@/domain/products/validation";
import { storefrontSchema } from "@/domain/appearance/storefront";
import { ProductContact } from "@/components/products/product-contact";
import { productInput, productDTO } from "../fixtures/product";
afterEach(cleanup);
it("normalizes commercial fields while rejecting duplicated options and invalid lead times", () => {
  expect(
    productSchema.parse({
      ...productInput,
      sku: " pla-01 ",
      colors: [" Azul ", "", "Branco"],
    }),
  ).toMatchObject({ sku: "PLA-01", colors: ["Azul", "Branco"] });
  for (const fields of [
    { colors: ["Azul", "azul"] },
    { leadTimeDays: 0 },
    { leadTimeDays: 1.5 },
    { sku: "sku inválido" },
    { availability: "fake" },
  ])
    expect(
      productSchema.safeParse({ ...productInput, ...fields }).success,
    ).toBe(false);
});
it("requires exactly one of each section and caps banners and features", () => {
  expect(storefrontSchema.parse({}).sectionOrder).toContain("catalog");
  expect(
    storefrontSchema.safeParse({
      sectionOrder: ["about", "about", "catalog", "banners"],
    }).success,
  ).toBe(false);
  expect(
    storefrontSchema.safeParse({ featuredCollectionIds: ["a", "a"] }).success,
  ).toBe(false);
  expect(
    storefrontSchema.safeParse({
      banners: Array(4).fill({
        title: "Título",
        text: "",
        collectionId: "",
        buttonText: "Ver",
      }),
    }).success,
  ).toBe(false);
});
it("waits for required options and includes them with SKU in the contact message", () => {
  render(
    <ProductContact
      product={{
        ...productDTO,
        sku: "PLA-01",
        colors: ["Azul", "Branco"],
        sizes: ["Grande"],
      }}
      phone="11999999999"
      email=""
      url="https://example.com/product"
    />,
  );
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "Azul" } });
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.change(screen.getByLabelText("Tamanho"), {
    target: { value: "Grande" },
  });
  const link = new URL(screen.getByRole("link").getAttribute("href")!);
  expect(link.searchParams.get("text")).toContain(
    "Código: PLA-01\nCor: Azul\nTamanho: Grande",
  );
});
it("offers a replenishment inquiry for unavailable items using email fallback", () => {
  render(
    <ProductContact
      product={{ ...productDTO, availability: "UNAVAILABLE" }}
      phone=""
      email="loja@example.com"
      url="https://example.com/product"
    />,
  );
  const link = screen.getByRole("link", { name: "Consultar reposição" });
  expect(decodeURIComponent(link.getAttribute("href")!)).toContain(
    "estará disponível novamente",
  );
  expect(screen.queryByText("Pedir pelo WhatsApp ↗")).toBeNull();
});
