import { catalogAvailability } from "@/domain/products/catalog-commercial-filters";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shapes, X } from "lucide-react";
import type { PublicCollectionDTO } from "@/domain/collections/types";
import {
  catalogPath,
  catalogContextPath,
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
            href={catalogPath(collection.slug ?? collection.id)}
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
              {collection.description.trim() && (
                <span className="mt-1 block text-xs leading-5 break-words text-muted-foreground">
                  {collection.description}
                </span>
              )}
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
        href={catalogContextPath(context, { collection: "", page: 1 })}
        aria-current={!context.collection ? "page" : undefined}
      >
        Todos os produtos
      </Link>
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={catalogContextPath(context, {
            collection: collection.slug ?? collection.id,
            page: 1,
          })}
          aria-current={
            context.collection === (collection.slug ?? collection.id)
              ? "page"
              : undefined
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
  if (
    !context.collection &&
    !context.search &&
    !context.priceMin &&
    !context.priceMax &&
    !context.availability
  )
    return null;
  return (
    <nav
      aria-label="Filtros ativos"
      className="mb-6 flex flex-wrap items-center gap-3 text-sm"
    >
      <span className="text-muted-foreground">Você está vendo:</span>
      {context.collection && (
        <Link
          aria-label={`Remover coleção ${collectionName ?? "selecionada"}`}
          href={catalogContextPath(context, { collection: "", page: 1 })}
          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-accent px-4 py-2"
        >
          <span className="min-w-0 break-words">
            {collectionName ?? "Coleção selecionada"}
          </span>
          <X size={14} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
      {context.search && (
        <Link
          aria-label={`Remover busca ${context.search}`}
          href={catalogContextPath(context, { search: "", page: 1 })}
          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-accent px-4 py-2"
        >
          <span className="min-w-0 break-words">“{context.search}”</span>
          <X size={14} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
      {(["priceMin", "priceMax", "availability"] as const)
        .filter((key) => context[key])
        .map((key) => (
          <Link
            key={key}
            aria-label={`Remover ${key === "priceMin" ? "preço mínimo" : key === "priceMax" ? "preço máximo" : "disponibilidade"}`}
            href={catalogContextPath(context, { [key]: undefined, page: 1 })}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-accent px-4 py-2"
          >
            <span className="min-w-0 break-words">
              {key === "availability"
                ? (catalogAvailability[
                    context.availability as keyof typeof catalogAvailability
                  ] ?? "Disponibilidade inválida")
                : `${key === "priceMin" ? "A partir de" : "Até"} R$ ${context[key]}`}
            </span>
            <X size={14} className="shrink-0" aria-hidden="true" />
          </Link>
        ))}
      <Link
        href="/catalogo#all-products"
        className="px-2 py-3 font-semibold text-primary underline underline-offset-4"
      >
        Limpar filtros
      </Link>
    </nav>
  );
}
