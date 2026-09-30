"use client";
import type { SaleDTO, QuoteDTO } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { documentSchema } from "@/domain/commerce/validation";
import { api } from "@/lib/client-api";
import { QuoteForm } from "./quote-form";
import type { CommercialProduct } from "./document-items";
export function SaleForm({
  sale,
  customers,
  products,
  onSaved,
  onCancel,
}: {
  sale?: SaleDTO;
  customers: CustomerDTO[];
  products: CommercialProduct[];
  onSaved: (s: SaleDTO) => void;
  onCancel: () => void;
}) {
  const quote: QuoteDTO | undefined = sale
    ? {
        id: sale.id,
        number: sale.number,
        status: "RASCUNHO",
        version: sale.version,
        input: sale.document,
        totals: sale.totals,
        snapshot: null,
        events: sale.events,
        createdAt: sale.createdAt,
        saleId: sale.id,
      }
    : undefined;
  return (
    <QuoteForm
      quote={quote}
      customers={customers}
      products={products}
      title={sale ? "Editar venda" : "Nova venda"}
      onSaved={() => {}}
      onCancel={onCancel}
      saveDraft={async (draft) => {
        const parsed = documentSchema.safeParse(draft);
        if (!parsed.success)
          throw new Error(
            "Informe cliente, itens e condições de pagamento válidos.",
          );
        onSaved(
          await api<SaleDTO>(
            sale ? `/api/sales/${sale.id}` : "/api/sales",
            {
              ...parsed.data,
              ...(sale ? { expectedVersion: sale.version } : {}),
            },
            sale ? "PUT" : "POST",
          ),
        );
      }}
    />
  );
}
