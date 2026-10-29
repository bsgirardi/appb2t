import { resolveCollection } from "@/domain/collections/navigation";
import { productStructuredData } from "@/domain/products/product-structured-data";
import { StoreBreadcrumb } from "@/components/products/store-breadcrumb";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  publicProduct,
  productMetadata,
  relatedProducts,
} from "@/server/storefront";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getPublicAppearance } from "@/server/appearance";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { productPath, safeJsonLd } from "@/domain/products/storefront";
import { appUrl } from "@/lib/env";
import { ProductExperience } from "@/components/products/product-experience";
import {
  catalogFilters,
  catalogContextPath,
  productBrowsePath,
  type CatalogQuery,
} from "@/domain/products/catalog-navigation";
import { listPublicCollections } from "@/server/collections";
import { CollectionNavigation } from "@/components/products/store-collections";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ id: string; slug: string }>;
  searchParams?: Promise<CatalogQuery>;
};
export async function generateMetadata({ params }: Props) {
  const product = await publicProduct((await params).id);
  if (!product)
    return {
      title: "Produto não encontrado",
      robots: { index: false, follow: true },
    };
  return productMetadata(product, (await getPublicAppearance()).name);
}
export default async function ProductPage({ params, searchParams }: Props) {
  const { id, slug } = await params;
  const query = (await searchParams) ?? {};
  const editLineId =
    typeof query.editar === "string" ? query.editar : undefined;
  const context = catalogFilters(query);
  const [product, identity, collections] = await Promise.all([
    publicProduct(id),
    getPublicAppearance(),
    listPublicCollections(),
  ]);
  if (!product) notFound();
  const collection = resolveCollection(collections, context.collection);
  if (collection) context.collection = collection.slug ?? collection.id;
  if (context.collection && !collection) {
    context.collection = "";
    context.page = 1;
  }
  const backHref = catalogContextPath(context) + "#all-products";
  const path = productPath(product);
  if (path !== `/portfolio/produto/${encodeURIComponent(id)}/${slug}`)
    permanentRedirect(productBrowsePath(product, context));
  const url = new URL(path, appUrl()).href;
  const related = await relatedProducts(id);
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      productStructuredData(product, identity.name, url),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Catálogo",
            item: new URL("/", appUrl()).href,
          },
          { "@type": "ListItem", position: 2, name: product.name, item: url },
        ],
      },
    ],
  };
  return (
    <StorefrontShell
      identity={identity}
      search={context.search}
      collection={context.collection}
      order={context.order}
      commercial={context}
    >
      <CollectionNavigation collections={collections} context={context} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structured) }}
      />
      <StoreBreadcrumb href={backHref} title={product.name} />
      <ProductExperience
        product={product}
        phone={identity.phone}
        email={identity.email}
        url={url}
        backHref={backHref}
        editLineId={editLineId}
      />

      {related.length > 0 && (
        <section
          className="store-featured"
          aria-labelledby="related-products-title"
        >
          <div className="store-section-heading">
            <h2 id="related-products-title">Mais da mesma coleção</h2>
            <Link href="/">Ver todo o catálogo →</Link>
          </div>
          <ProductCatalog products={related} context={context} />
        </section>
      )}
      <Link className="store-back" href={backHref}>
        ← Voltar aos resultados
      </Link>
    </StorefrontShell>
  );
}
