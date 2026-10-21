import type { ConfiguredPrice } from "@/domain/products/configuration-price";
import { formatBRL } from "@/domain/calculation/calculate";
import type { QuantityTier } from "@/domain/products/quantity-pricing";
export function ProductPriceSummary({
  price,
  quantity,
  quantityTiers = [],
  inKit = false,
}: {
  price: ConfiguredPrice | null;
  quantity: number;
  quantityTiers?: QuantityTier[];
  inKit?: boolean;
}) {
  const tier = !inKit
    ? quantityTiers
        .filter((t) => t.minQuantity <= quantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0]
    : undefined;
  return (
    <div className="store-config-price" aria-live="polite">
      {price?.kind === "REFERENCE" ? (
        <>
          <span>
            Referência por unidade <strong>{formatBRL(price.unit)}</strong>
          </span>
          <span>
            Subtotal de referência ({quantity} un.){" "}
            <strong>{formatBRL(price.subtotal)}</strong>
          </span>
        </>
      ) : (
        <strong>
          {price?.kind === "CONSULT"
            ? "Valor sob consulta"
            : "Complete as escolhas para conferir o valor"}
        </strong>
      )}
      {inKit ? (
        <small>
          Neste kit, os componentes usam o preço-base e os adicionais. O
          desconto é calculado no resumo do conjunto.
        </small>
      ) : tier && price?.kind === "REFERENCE" ? (
        <small>
          Faixa aplicada: a partir de {tier.minQuantity} unidades desta
          personalização. Preço-base de {formatBRL(tier.baseUnitPrice)} por
          unidade, com os adicionais somados depois.
        </small>
      ) : quantityTiers.length > 0 && price?.kind === "REFERENCE" ? (
        <small>
          Há preços por quantidade para esta mesma personalização:{" "}
          {quantityTiers
            .slice()
            .sort((a, b) => a.minQuantity - b.minQuantity)
            .map(
              (t) => `${t.minQuantity} un.: base ${formatBRL(t.baseUnitPrice)}`,
            )
            .join("; ")}
          . Adicionais à parte.
        </small>
      ) : null}
      <small>
        Sem frete. Disponibilidade e condições finais serão confirmadas pela
        equipe.
      </small>
    </div>
  );
}
