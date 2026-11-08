import Image from "next/image";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Box, ArrowUpRight } from "lucide-react";
import {
  catalogContextPath,
  productBrowsePath,
  type CatalogFilters,
} from "@/domain/products/catalog-navigation";
import { formatBRL } from "@/domain/calculation/calculate";
import type { PublicProductDTO } from "@/domain/products/types";
import { availabilityLabels } from "@/domain/products/commercial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductProductionTime } from "./product-production-time";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export function ProductCatalog({
  products,
  context,
}: {
  products: PublicProductDTO[];
  context?: CatalogFilters;
}) {
  const hasSearchCriteria = !!(
    context?.search ||
    context?.priceMin?.trim() ||
    context?.priceMax?.trim() ||
    context?.availability
  );
  if (!products.length)
    return (
      <Empty className="store-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Box aria-hidden="true" />
          </EmptyMedia>
          <h2>
            {hasSearchCriteria
              ? "Nenhum produto encontrado."
              : context?.collection
                ? "Nenhum produto nesta coleção."
                : "Nenhum produto publicado ainda."}
          </h2>
          <EmptyDescription>
            {context?.search
              ? "Confira a grafia ou tente menos palavras. Você também pode remover apenas a busca e manter os outros filtros."
              : hasSearchCriteria
                ? "Tente outro termo ou remova os filtros para explorar o catálogo."
                : context?.collection
                  ? "Explore outras coleções para conhecer as peças disponíveis."
                  : "Quando houver produtos publicados, eles aparecerão aqui."}
          </EmptyDescription>
        </EmptyHeader>
        {(hasSearchCriteria || context?.collection) && (
          <EmptyContent>
            {context?.search && (
              <Button asChild variant="outline">
                <Link
                  href={catalogContextPath(context, { search: "", page: 1 })}
                >
                  Remover apenas a busca
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/#all-products">Ver todos os produtos</Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  return (
    <div className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} asChild className="p-0">
          <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl">
            <Link
              href={productBrowsePath(product, context)}
              aria-label={`Ver fotos e detalhes de ${product.name}`}
              className="block aspect-square overflow-hidden bg-white"
            >
              {product.images[0] ? (
                <Image
                  src={product.images[0].url}
                  alt={`${product.name} — foto 1 de ${product.images.length}`}
                  width={800}
                  height={800}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-b2t-navy">
                  <Box size={48} aria-hidden="true" />
                  <span className="sr-only">Foto em preparação</span>
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <Badge variant="outline">
                {availabilityLabels[product.availability ?? "CONSULT"]}
              </Badge>
              <h2 className="text-base leading-snug font-semibold break-words">
                <Link
                  href={productBrowsePath(product, context)}
                  className="hover:text-primary"
                >
                  {product.name}
                </Link>
              </h2>
              <p className="line-clamp-2 text-xs leading-5 break-words text-muted-foreground">
                {product.shortDescription || product.description}
              </p>
              {!!product.configuration?.fields.length && (
                <span className="store-personalizable">Personalizável</span>
              )}
              {(product.minimumQuantity ?? 1) > 1 && (
                <p className="text-xs leading-5 break-words text-muted-foreground">
                  Mínimo de {product.minimumQuantity!.toLocaleString("pt-BR")}{" "}
                  unidades por configuração.
                </p>
              )}
              <div className="mt-auto pt-2">
                <strong className="text-xl font-bold">
                  {product.price === null
                    ? "Sob consulta"
                    : formatBRL(product.price)}
                </strong>
                {product.price !== null && (
                  <div className="store-price-nature">
                    <p>Referência por unidade</p>
                    {!!product.configuration?.fields.length && (
                      <p>
                        Adicionais, quando aplicáveis, dependem das escolhas.
                      </p>
                    )}
                  </div>
                )}
                {product.leadTimeDays ? (
                  <div className="mt-3 text-xs leading-5 break-words text-muted-foreground">
                    <ProductProductionTime days={product.leadTimeDays} />
                  </div>
                ) : null}
                <p className="mt-1 text-xs leading-5 break-words text-muted-foreground">
                  {product.paymentTerms}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-1 w-full justify-between rounded-xl px-3 text-xs sm:text-sm"
              >
                <Link href={productBrowsePath(product, context)}>
                  Ver produto <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}
