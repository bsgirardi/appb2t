import type { CatalogReceipt } from "@/domain/catalog-requests/types";
export function RequestReceipt({ receipt }: { receipt: CatalogReceipt }) {
  return (
    <div role="status" className="store-request-receipt">
      <h3>Solicitação recebida</h3>
      <strong>{receipt.protocol}</strong>
      <p>
        {new Date(receipt.acceptedAt).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}
      </p>
      <p>
        A equipe vai revisar sua seleção e retornar pelo contato informado. Este
        recebimento não confirma venda, preço final, pagamento ou reserva.
      </p>
    </div>
  );
}
