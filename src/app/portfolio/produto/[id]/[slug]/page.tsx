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
import { ProductCarousel } from "@/components/products/product-carousel";
import { productPath, safeJsonLd } from "@/domain/products/storefront";
import { formatBRL } from "@/domain/calculation/calculate";
import { appUrl } from "@/lib/env";
import { availabilityLabels } from "@/domain/products/commercial";
import { ProductContact } from "@/components/products/product-contact";
import {
  catalogFilters,
  catalogPath,
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
  const context = catalogFilters((await searchParams) ?? {});
  const [product, identity, collections] = await Promise.all([
    publicProduct(id),
    getPublicAppearance(),
    listPublicCollections(),
  ]);
  if (!product) notFound();
  if (
    context.collection &&
    !collections.some((c) => c.id === context.collection)
  ) {
    context.collection = "";
    context.page = 1;
  }
  const backHref =
    catalogPath(
      context.collection,
      context.search,
      context.order,
      context.page,
    ) + "#all-products";
  const path = productPath(product);
  if (path !== `/portfolio/produto/${encodeURIComponent(id)}/${slug}`)
    permanentRedirect(productBrowsePath(product, context));
  const url = new URL(path, appUrl()).href;
  const related = await relatedProducts(id);
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        ...(product.sku ? { sku: product.sku } : {}),
        description: product.description,
        url,
        image: product.images.map((i) => new URL(i.url, appUrl()).href),
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: product.price,
          ...(product.availability === "AVAILABLE"
            ? { availability: "https://schema.org/InStock" }
            : product.availability === "UNAVAILABLE"
              ? { availability: "https://schema.org/OutOfStock" }
              : {}),
          url,
          seller: { "@type": "Organization", name: identity.name },
        },
      },
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
    >
      <CollectionNavigation collections={collections} context={context} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structured) }}
      />
      <StoreBreadcrumb href={backHref} title={product.name} />
      <article className="store-detail">
        <ProductCarousel name={product.name} images={product.images} />
        <div className="store-detail-info">
          <span className="store-kicker">{identity.name}</span>
          <h1>{product.name}</h1>
          {product.sku && <p className="store-sku">Código: {product.sku}</p>}
          {product.shortDescription && (
            <p className="store-short-description">
              {product.shortDescription}
            </p>
          )}
          <p
            className="store-availability"
            data-availability={product.availability ?? "CONSULT"}
          >
            {availabilityLabels[product.availability ?? "CONSULT"]}
          </p>
          {product.leadTimeDays && (
            <p className="store-lead-time">
              Produção em até {product.leadTimeDays}{" "}
              {product.leadTimeDays === 1 ? "dia útil" : "dias úteis"}. Prazo de
              entrega à parte.
            </p>
          )}
          <strong className="store-price">{(product.price === null ? "Sob consulta" : formatBRL(product.price))}</strong>
          <p className="store-payment">{product.paymentTerms}</p>
          <ProductContact
            product={product}
            phone={identity.phone}
            email={identity.email}
            url={url}
          />
          <p className="store-note">
            Confirme disponibilidade, prazo e entrega com nossa equipe antes de
            concluir o pedido.
          </p>
          <section className="store-description">
            <h2>Sobre o produto</h2>
            <p>{product.description}</p>
          </section>
          {product.specifications && (
            <section className="store-description">
              <h2>Especificações</h2>
              <p>{product.specifications}</p>
            </section>
          )}
        </div>
      </article>
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
