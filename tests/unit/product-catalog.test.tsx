// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProductCatalog } from "@/components/products/product-catalog";
afterEach(cleanup);
it("shows price and payment terms while escaping description markup", () => {
  const { container } = render(
    <ProductCatalog
      products={[
        {
          id: "1",
          name: "Vaso",
          description: '<script>alert("x")</script>',
          price: "48.19",
          paymentTerms: "Pix ou cartão",
          imageUrl: "/photo",
          images: [{ id: "photo", url: "/photo", position: 0 }],
        },
      ]}
    />,
  );
  expect(screen.getByText("R$ 48,19")).toBeTruthy();
  expect(screen.getByText("Pix ou cartão")).toBeTruthy();
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByAltText("Vaso — foto 1 de 1")).toBeTruthy();
});
it("shows an honest empty state", () => {
  render(<ProductCatalog products={[]} />);
  expect(screen.getByText(/Nenhum produto publicado/)).toBeTruthy();
});
