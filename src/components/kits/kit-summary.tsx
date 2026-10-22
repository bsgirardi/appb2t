import { Alert } from "@/components/ui/alert";
import { formatBRL } from "@/domain/calculation/calculate";
import type { KitGroupReview } from "@/domain/kits/types";
export function KitSummary({ review }: { review: KitGroupReview | null }) {
  if (!review)
    return <p>Escolha as peças para conferir a referência do kit.</p>;
  const price = review.price;
  return (
    <section className="kit-summary" aria-label={`Resumo de ${review.name}`}>
      <h2>{review.name}</h2>
      {review.problem && <Alert role="alert">{review.problem}</Alert>}
      {review.requiresConfirmation && review.seenPrice?.total && (
        <p className="store-note">
          Referência anterior do kit: {formatBRL(review.seenPrice.total)}.
          Confira a regra e os valores atuais antes de confirmar.
        </p>
      )}
      {price && (
        <>
          <p>{price.quantity} unidades neste kit</p>
          {price.kind === "REFERENCE" ? (
            <dl>
              <div>
                <dt>Soma dos componentes</dt>
                <dd>{formatBRL(price.subtotal!)}</dd>
              </div>
              <div>
                <dt>Desconto do kit</dt>
                <dd>{formatBRL(price.discount!)}</dd>
              </div>
              <div>
                <dt>Total de referência do kit</dt>
                <dd>
                  <strong>{formatBRL(price.total!)}</strong>
                </dd>
              </div>
            </dl>
          ) : (
            <>
              <p>
                Soma dos componentes com referência:{" "}
                {formatBRL(price.knownSubtotal)}
              </p>
              <strong>Total do kit a confirmar</strong>
              <p>
                Há componentes sob consulta. O desconto não foi aplicado a uma
                soma parcial.
              </p>
            </>
          )}
          {price.tier && (
            <p className="store-note">
              Regra {price.kind === "CONSULT" ? "elegível" : "aplicada"}: a
              partir de {price.tier.minQuantity} unidades,{" "}
              {price.tier.kind === "PERCENT"
                ? `${price.tier.percent.replace(/\.00$/, "")}%`
                : formatBRL(price.tier.amount)}{" "}
              de desconto
              {price.tier.kind === "FIXED" ? " uma vez no total do kit" : ""}.
            </p>
          )}
        </>
      )}
      <p className="store-note">
        Sem frete. Valores e disponibilidade serão confirmados pela equipe. A
        composição é ilustrativa.
      </p>
    </section>
  );
}
