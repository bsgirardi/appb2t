// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QuoteForm } from "@/components/commerce/quote-form";
import { DocumentPrint } from "@/components/commerce/document-print";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("preserves a partial draft after a save conflict", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: { message: "Conflito de versão" } }), {
      status: 409,
    }),
  );
  render(
    <QuoteForm
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Notas internas"), {
    target: { value: "Manter observação" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await screen.findByText("Conflito de versão");
  expect(
    (screen.getByLabelText("Notas internas") as HTMLTextAreaElement).value,
  ).toBe("Manter observação");
});
it("prints only commercial snapshot data", () => {
  const { container } = render(
    <DocumentPrint
      number="ORC-000001"
      validUntil="2026-10-01"
      paymentTerms="Pix"
      totals={{
        subtotal: "10.00",
        discount: "0.00",
        shipping: "0.00",
        total: "10.00",
      }}
      snapshot={{
        company: {
          name: "Empresa",
          shortName: "E",
          slogan: "",
          email: "",
          phone: "",
          address: "",
          footer: "",
          logoUrl: null,
        },
        customer: {
          name: "Cliente",
          type: "PERSON",
          document: "",
          email: "",
          phone: "",
          address: "",
        },
        items: [
          {
            name: "Produto",
            description: "Peça",
            quantity: 1,
            unitPrice: "10.00",
          },
        ],
        issuedAt: "2026-09-29T12:00:00Z",
      }}
    />,
  );
  expect(container.textContent).toContain("Cliente");
  expect(container.textContent).toContain("Pix");
  expect(container.textContent).not.toMatch(/Notas internas|Custo|Margem/);
});
