import type { CheckoutReview } from "@/domain/checkout/types";
import { formatBRL } from "@/domain/calculation/calculate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
export function CheckoutSummary({ review }: { review: CheckoutReview }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Confira seu pedido</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-4">
          {review.lines.map((l) => (
            <li key={l.lineId} className="break-words">
              <strong>{l.name}</strong>
              <p>
                {l.quantity} unidade(s) ·{" "}
                {l.unitPrice ? formatBRL(l.unitPrice) : "Sob consulta"}
              </p>
              {l.color && <p>Cor: {l.color}</p>}
              {l.size && <p>Tamanho: {l.size}</p>}
              {l.answerLabels.map((a) => (
                <p key={a.fieldId}>
                  {a.label}: {a.valueLabel}
                </p>
              ))}
              <small>
                Prazo de produção:{" "}
                {l.productionLeadDays === null
                  ? "a confirmar"
                  : `${l.productionLeadDays} dia(s)`}
                . {l.leadTimeCondition}
              </small>
            </li>
          ))}
        </ul>
        {review.discount !== "0.00" && (
          <p>Desconto: {formatBRL(review.discount)}</p>
        )}
        <p>
          {review.delivery.mode === "PICKUP"
            ? `Retirada: ${review.pickupAddress}`
            : `Entrega: ${Object.values(review.delivery.address).filter(Boolean).join(", ")}`}
        </p>
        <p>
          {review.shipping === null
            ? "Frete a definir pela equipe"
            : `Frete: ${formatBRL(review.shipping)}`}
        </p>
        <p className="text-xl font-semibold">
          {review.total === null
            ? "Total após conferência"
            : `Total: ${formatBRL(review.total)}`}
        </p>
        <p>
          O prazo de transporte depende da modalidade e da confirmação da
          equipe.
        </p>
        {review.reasons.map((reason) => (
          <Alert key={reason}>{reason}</Alert>
        ))}
        {review.validUntil && (
          <p>
            Orçamento válido até{" "}
            {review.validUntil.split("-").reverse().join("/")}.
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{review.paymentTerms}</p>
        {review.installments.map((p) => (
          <p key={p.number}>
            Parcela {p.number}: {formatBRL(p.amount)} · vencimento{" "}
            {p.dueDate.split("-").reverse().join("/")}
          </p>
        ))}
        <small>
          Pagamento externo registrado pela equipe. A confirmação comercial não
          reserva materiais ou capacidade de produção automaticamente. A
          produção depende da liberação da equipe e da aprovação de arte quando
          exigida.
        </small>
      </CardContent>
    </Card>
  );
}
