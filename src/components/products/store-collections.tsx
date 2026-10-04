import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shapes, X } from "lucide-react";
import type { PublicCollectionDTO } from "@/domain/collections/types";
import {
  catalogPath,
  type CatalogFilters,
} from "@/domain/products/catalog-navigation";

export function StoreCollections({
  collections,
}: {
  collections: PublicCollectionDTO[];
}) {
  if (!collections.length) return null;
  return (
    <section aria-labelledby="discover-collections" className="py-8">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          Encontre a sua próxima ideia
        </p>
        <h2
          id="discover-collections"
          className="text-2xl font-bold md:text-3xl"
        >
          Explore nossas coleções
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={catalogPath(collection.id)}
            className="group flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-background p-4 hover:border-primary"
          >
            {collection.imageUrl ? (
              <Image
                src={collection.imageUrl}
                alt=""
                width={96}
                height={96}
                unoptimized
                className="size-20 shrink-0 rounded-xl bg-white object-contain"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Shapes size={32} aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0">
              <strong className="block text-sm break-words">
                {collection.name}
              </strong>
              <span className="mt-2 flex items-center gap-2 text-xs text-primary">
                Explorar <ArrowRight size={14} aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CollectionNavigation({
  collections,
  context,
}: {
  collections: PublicCollectionDTO[];
  context: CatalogFilters;
}) {
  return (
    <nav className="store-categories" aria-label="Categorias">
      <Link
        href={catalogPath("", context.search, context.order)}
        aria-current={!context.collection ? "page" : undefined}
      >
        Todos os produtos
      </Link>
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={catalogPath(collection.id, context.search, context.order)}
          aria-current={
            context.collection === collection.id ? "page" : undefined
          }
        >
          {collection.name}
        </Link>
      ))}
    </nav>
  );
}

export function ActiveCatalogFilters({
  context,
  collectionName,
}: {
  context: CatalogFilters;
  collectionName?: string;
}) {
  if (!context.collection && !context.search) return null;
  return (
    <nav
      aria-label="Filtros ativos"
      className="mb-6 flex flex-wrap items-center gap-3 text-sm"
    >
      <span className="text-muted-foreground">Você está vendo:</span>
      {context.collection && (
        <Link
          aria-label={`Remover coleção ${collectionName ?? "selecionada"}`}
          href={catalogPath("", context.search, context.order)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 py-2"
        >
          {collectionName ?? "Coleção selecionada"}
          <X size={14} aria-hidden="true" />
        </Link>
      )}
      {context.search && (
        <Link
          aria-label={`Remover busca ${context.search}`}
          href={catalogPath(context.collection, "", context.order)}
          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-accent px-4 py-2"
        >
          <span className="break-words">“{context.search}”</span>
          <X size={14} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
      <Link
        href="/#all-products"
        className="px-2 py-3 font-semibold text-primary underline underline-offset-4"
      >
        Limpar filtros
      </Link>
    </nav>
  );
}
