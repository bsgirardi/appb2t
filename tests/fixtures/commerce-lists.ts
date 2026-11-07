import type { QuoteDTO, SaleDTO } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";

// Synthetic only; no server modules, authentication or database.
export const listCustomer: CustomerDTO = {
  id: "preview-customer",
  version: 1,
  type: "COMPANY",
  active: true,
  name: "Associação de artesãos e projetos especiais — cliente sintético com nome muito longo para revisão de leitura e quebra de linha",
  document: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};
export const listQuotes: QuoteDTO[] = [
  "RASCUNHO",
  "ENVIADO",
  "APROVADO",
  "REJEITADO",
  "EXPIRADO",
  "CONVERTIDO",
].map((status, i) => ({
  id: `preview-q-${i}`,
  number: `ORC-2026-${100 + i}`,
  status: status as QuoteDTO["status"],
  version: 1,
  input: { customerId: listCustomer.id },
  totals:
    i === 0
      ? null
      : {
          subtotal: "123456.78",
          discount: "0.00",
          shipping: "0.00",
          total: "123456.78",
        },
  snapshot: null,
  events: [],
  createdAt: "2026-11-07",
  saleId: null,
}));
export const listSales: SaleDTO[] = [
  "RASCUNHO",
  "CONFIRMADA",
  "EM_PRODUCAO",
  "PRONTA",
  "ENTREGUE",
  "CANCELADA",
].map((status, i) => ({
  id: `preview-s-${i}`,
  number: `VEN-2026-${100 + i}`,
  status: status as SaleDTO["status"],
  version: 1,
  quoteId: null,
  document: {
    customerId: listCustomer.id,
    items: [],
    discount: "0.00",
    shipping: "0.00",
    paymentTerms: "",
    internalNotes: "",
  },
  totals: {
    subtotal: "123456.78",
    discount: "0.00",
    shipping: "0.00",
    total: "123456.78",
  },
  snapshot: null,
  installments: [],
  receiptSummary: {
    total: "123456.78",
    received: "0.00",
    pending: "123456.78",
    overdue: "0.00",
  },
  expectedDeliveryDate: null,
  operationalNotes: "",
  events: [],
  createdAt: "2026-11-07",
}));
