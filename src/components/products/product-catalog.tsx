import Image from "next/image";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Box, ArrowUpRight } from "lucide-react";
import {
  productBrowsePath,
  type CatalogFilters,
} from "@/domain/products/catalog-navigation";
import { formatBRL } from "@/domain/calculation/calculate";
import type { PublicProductDTO } from "@/domain/products/types";
import { availabilityLabels } from "@/domain/products/commercial";
import { Button } from "@/components/ui/button";

export function ProductCatalog({
  products,
  context,
}: {
  products: PublicProductDTO[];
  context?: CatalogFilters;
}) {
  if (!products.length)
    return (
      <div className="store-empty">
        <Box size={36} aria-hidden="true" />
        <h2>Nenhum produto publicado ainda.</h2>
        <p>
          Estamos preparando novas peças. Volte em breve para conhecer nossa
          coleção.
        </p>
      </div>
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
                  className="h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-b2t-navy">
                  <Box size={48} aria-hidden="true" />
                  <span className="sr-only">Foto em preparação</span>
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
              <span className="text-xs font-semibold text-muted-foreground">
                {availabilityLabels[product.availability ?? "CONSULT"]}
              </span>
              <h2 className="text-base leading-snug font-semibold break-words">
                <Link
                  href={productBrowsePath(product, context)}
                  className="hover:text-primary"
                >
                  {product.name}
                </Link>
              </h2>
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {product.shortDescription || product.description}
              </p>
              <div className="mt-auto pt-2">
                <strong className="text-xl font-bold">
                  {formatBRL(product.price)}
                </strong>
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
