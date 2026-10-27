import type { ConfiguredPrice } from "@/domain/products/configuration-price";
import { formatBRL } from "@/domain/calculation/calculate";
import type { QuantityTier } from "@/domain/products/quantity-pricing";
import type { PriceMode } from "@/domain/products/configuration";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export function ProductPriceSummary({
  price,
  quantity,
  quantityTiers = [],
  inKit = false,
  priceMode = "REFERENCE",
}: {
  price: ConfiguredPrice | null;
  quantity: number;
  quantityTiers?: QuantityTier[];
  inKit?: boolean;
  priceMode?: PriceMode;
}) {
  const tiers = [...quantityTiers].sort(
    (a, b) => a.minQuantity - b.minQuantity,
  );
  const tier =
    price?.kind === "REFERENCE"
      ? tiers.findLast((t) => t.minQuantity <= quantity)
      : undefined;
  const showTiers =
    !inKit &&
    priceMode === "REFERENCE" &&
    price?.kind !== "CONSULT" &&
    tiers.length > 0;
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
          {price?.kind === "CONSULT" || priceMode === "CONSULT"
            ? "Valor sob consulta"
            : "Complete as escolhas para conferir o valor"}
        </strong>
      )}
      {inKit ? (
        <small>
          Neste kit, os componentes usam o preço-base e os adicionais. O
          desconto é calculado no resumo do conjunto.
        </small>
      ) : showTiers ? (
        <div className="store-quantity-prices">
          <Table className="min-w-0 table-fixed">
            <TableCaption className="caption-top mt-0 mb-3 text-left">
              Preços por quantidade
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">
                  Quantidade da mesma personalização
                </TableHead>
                <TableHead scope="col">Preço-base por unidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((row) => (
                <TableRow
                  key={row.minQuantity}
                  data-state={tier === row ? "selected" : undefined}
                >
                  <TableCell>
                    <span className="block">
                      A partir de {row.minQuantity} un.
                    </span>
                    {tier === row && (
                      <Badge
                        variant="outline"
                        className="mt-1 whitespace-normal"
                      >
                        Faixa aplicada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatBRL(row.baseUnitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs leading-5">
            Valores para a mesma personalização. Adicionais, quando aplicáveis,
            são somados ao preço-base e aparecem no valor por unidade e no
            subtotal.
          </p>
        </div>
      ) : null}
      <small>
        Sem frete. Disponibilidade e condições finais serão confirmadas pela
        equipe.
      </small>
    </div>
  );
}
