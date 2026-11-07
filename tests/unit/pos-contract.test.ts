import { describe, expect, it } from "vitest";
import {
  posDraftSchema,
  calculatePosPayment,
  posDocumentSchema,
} from "@/domain/pos/validation";
import { documentSchema } from "@/domain/commerce/validation";

describe("contrato presencial", () => {
  const draft = {
    items: [],
    customerId: null,
    newCustomer: null,
    discount: "0.00",
    method: "PIX",
    tendered: "",
  };
  it("permite compra sem cadastro ou com identificação opcional exclusiva", () => {
    expect(posDraftSchema.parse(draft).customerId).toBeNull();
    expect(
      posDraftSchema.parse({ ...draft, customerId: "real" }).customerId,
    ).toBe("real");
    expect(
      posDraftSchema.parse({
        ...draft,
        newCustomer: { name: "Maria", phone: "11999999999", email: "" },
      }).newCustomer?.name,
    ).toBe("Maria");
    expect(
      posDraftSchema.safeParse({
        ...draft,
        customerId: "real",
        newCustomer: { name: "Maria", phone: "", email: "" },
      }).success,
    ).toBe(false);
  });
  it("calcula troco decimal e rejeita dinheiro insuficiente e formas desconhecidas", () => {
    expect(calculatePosPayment("19.90", "CASH", "20,00")).toEqual({
      method: "CASH",
      tendered: "20.00",
      change: "0.10",
    });
    expect(() => calculatePosPayment("19.90", "CASH", "19.89")).toThrow();
    expect(calculatePosPayment("19.90", "PIX", "")).toEqual({
      method: "PIX",
      tendered: null,
      change: "0.00",
    });
    expect(
      posDraftSchema.safeParse({ ...draft, method: "MIXED" }).success,
    ).toBe(false);
  });
  it("anonimato é contrato explícito do PDV, nunca documento comum", () => {
    const document = {
      customerId: null,
      customerIdentification: "UNIDENTIFIED",
      items: [
        {
          productId: "p",
          lineId: "p",
          description: "Peça",
          quantity: 1,
          unitPrice: "10.00",
        },
      ],
      discount: "0.00",
      shipping: "0.00",
      paymentTerms: "Pix informado",
      internalNotes: "",
    };
    expect(posDocumentSchema.safeParse(document).success).toBe(true);
    expect(documentSchema.safeParse(document).success).toBe(false);
    expect(
      posDocumentSchema.safeParse({ ...document, customerId: "real" }).success,
    ).toBe(false);
  });
});
