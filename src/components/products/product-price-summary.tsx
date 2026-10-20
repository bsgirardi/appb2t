import type { ConfiguredPrice } from "@/domain/products/configuration-price";
import { formatBRL } from "@/domain/calculation/calculate";
export function ProductPriceSummary({
  price,
  quantity,
}: {
  price: ConfiguredPrice | null;
  quantity: number;
}) {
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
      <small>
        Sem frete. Disponibilidade e condições finais serão confirmadas pela
        equipe.
      </small>
    </div>
  );
}
