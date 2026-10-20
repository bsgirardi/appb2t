import { it, expect } from "vitest";
import { productStructuredData } from "@/domain/products/product-structured-data";
import { productDTO } from "../fixtures/product";
import { emptyProductConfiguration } from "@/domain/products/configuration";
it("omits an offer for consultation and variable-priced configuration", () => {
  expect(
    productStructuredData(
      { ...productDTO, price: null, publicPriceMode: "CONSULT" },
      "B2T",
      "http://localhost/p",
    ),
  ).not.toHaveProperty("offers");
  expect(
    productStructuredData(
      {
        ...productDTO,
        configuration: {
          ...emptyProductConfiguration,
          fields: [
            {
              id: "name",
              label: "Nome",
              help: "",
              required: false,
              type: "SHORT_TEXT",
              maxLength: 120,
              effect: { kind: "ADD", amount: "1.00" },
            },
          ],
        },
      },
      "B2T",
      "http://localhost/p",
    ),
  ).not.toHaveProperty("offers");
  expect(
    productStructuredData(productDTO, "B2T", "http://localhost/p"),
  ).toHaveProperty("offers.price", productDTO.price);
});
