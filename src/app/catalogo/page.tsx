import { resolveCollection } from "@/domain/collections/navigation";
import { Pagination } from "@/components/ui/pagination";
import { CatalogFilterForm } from "@/components/products/catalog-filter-form";
import { catalogCommercialErrors } from "@/domain/products/catalog-commercial-filters";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAppearance } from "@/server/appearance";
import { listPublicCollections } from "@/server/collections";
import { catalogPage, publicMetadata } from "@/server/storefront";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { summary } from "@/domain/products/storefront";
import { listPublicKits } from "@/server/kits/queries";
import { StoreKits } from "@/components/products/storefront-sections";
export const dynamic = "force-dynamic";
import {
  catalogContextPath,
  catalogFilters as filters,
  catalogPath as path,
  type CatalogQuery as Query,
} from "@/domain/products/catalog-navigation";
import {
  CollectionNavigation,
  ActiveCatalogFilters,
} from "@/components/products/store-collections";
type Props = { searchParams: Promise<Query> };
export async function generateMetadata({ searchParams }: Props) {
  const f = filters(await searchParams);
  const [identity, collections] = await Promise.all([
    getPublicAppearance(),
    listPublicCollections(),
  ]);
  const collection = resolveCollection(collections, f.collection);
  if (collection) f.collection = collection.slug ?? collection.id;
  const config = identity.storefront ?? defaultStorefront;
  const metadata = publicMetadata(
    `${collection ? `${collection.name} | ${identity.name}` : config.seoTitle || `Catálogo | ${identity.name}`}${f.page > 1 ? ` — Página ${f.page}` : ""}`,
    (!collection && config.seoDescription) ||
      summary(
        collection?.description ||
          identity.slogan ||
          `Conheça os produtos da ${identity.name}.`,
      ),
    path(f.collection, "", "nome", f.page),
    collection?.imageUrl || identity.logoUrl || undefined,
    config.seo,
  );
  if (
    f.search ||
    f.priceMin ||
    f.priceMax ||
    f.availability ||
    f.order !== "nome" ||
    (f.collection && !collection)
  )
    metadata.robots = { index: false, follow: true };
  return metadata;
}
export default async function PortfolioPage({ searchParams }: Props) {
  const f = filters(await searchParams);
  const [identity, collections, kits] = await Promise.all([
    getPublicAppearance(),
    listPublicCollections(),
    listPublicKits(),
  ]);
  const collection = resolveCollection(collections, f.collection);
  if (collection) f.collection = collection.slug ?? collection.id;
  if (f.collection && !collection) notFound();
  const invalid = Object.keys(catalogCommercialErrors(f)).length > 0;
  const data = invalid
    ? { products: [], total: 0, pages: 0, approximate: false }
    : await catalogPage(collection?.id, f.search, f.order, f.page, f);
  if (!invalid && f.page > 1 && f.page > data.pages) notFound();
  const catalog = (
    <section id="all-products">
      <div className="store-heading">
        <div>
          <span className="store-kicker">{identity.name}</span>
          <h1>
            {f.search
              ? `Resultados para “${f.search}”`
              : collection?.name || "Catálogo de produtos"}
          </h1>
          <p>{collection?.description || identity.slogan}</p>
        </div>
        <span>
          {invalid
            ? "Corrija os filtros"
            : `${data.total} ${data.total === 1 ? "produto" : "produtos"}`}
        </span>
      </div>
      <ActiveCatalogFilters context={f} collectionName={collection?.name} />
      <CatalogFilterForm context={f} collections={collections} />
      {data.approximate && (
        <Alert role="status" className="mb-6">
          Resultados aproximados para “{f.search}”. Não encontramos uma
          correspondência exata; todos os filtros foram mantidos.
        </Alert>
      )}
      {(f.order === "menor-preco" || f.order === "maior-preco") && (
        <p className="store-note">
          Ordenação pelo preço-base. Adicionais dependem das escolhas.
          {!f.priceMin?.trim() &&
            !f.priceMax?.trim() &&
            " Produtos com preço sob consulta aparecem ao final."}
        </p>
      )}
      {invalid ? (
        <Alert>Corrija os filtros acima para consultar os produtos.</Alert>
      ) : (
        <ProductCatalog products={data.products} context={f} />
      )}
      {data.pages > 1 && (
        <Pagination
          className="store-pagination"
          aria-label="Páginas do catálogo"
        >
          {f.page > 1 && (
            <Link href={catalogContextPath(f, { page: f.page - 1 })}>
              ← Anterior
            </Link>
          )}
          <span>
            Página {f.page} de {data.pages}
          </span>
          {f.page < data.pages && (
            <Link href={catalogContextPath(f, { page: f.page + 1 })}>
              Próxima →
            </Link>
          )}
        </Pagination>
      )}
    </section>
  );
  return (
    <StorefrontShell
      identity={identity}
      search={f.search}
      collection={f.collection}
      order={f.order}
      commercial={f}
    >
      <CollectionNavigation collections={collections} context={f} />
      {catalog}
      <StoreKits kits={kits} />
    </StorefrontShell>
  );
}
