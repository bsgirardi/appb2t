import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Box } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { getPublicAppearance } from "@/server/appearance";
import { ProductCatalog } from "@/components/products/product-catalog";
import { listPublicProducts } from "@/server/products";
import { listPublicCollections } from "@/server/collections";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const identity = await getPublicAppearance();
  return {
    title: `Portfólio | ${identity.name}`,
    description: identity.slogan,
  };
}
export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ colecao?: string | string[] }>;
}) {
  const query = (await searchParams).colecao;
  const identity = await getPublicAppearance();
  const collectionId =
    typeof query === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(query)
      ? query
      : undefined;
  const [products, collections] = await Promise.all([
    listPublicProducts(collectionId),
    listPublicCollections(),
  ]);
  return (
    <div className="portfolio-page">
      <header className="portfolio-header">
        <Link href="/portfolio" aria-label={`${identity.name} portfólio`}>
          <Brand identity={identity} />
        </Link>
        <Link href="/produtos" className="button secondary">
          Área da equipe <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="portfolio-main">
        <section className="portfolio-hero">
          <div>
            <div className="eyebrow">{identity.name} · PORTFÓLIO</div>
            <h1>
              Ideias que ganham <span>forma.</span>
            </h1>
            <p>{identity.slogan}</p>
          </div>
          <div className="portfolio-hero-icon" aria-hidden="true">
            <Box size={104} strokeWidth={0.8} />
          </div>
        </section>
        <div className="catalog-heading">
          <h2>Nossa coleção</h2>
          <span>
            {products.length}{" "}
            {products.length === 1
              ? "produto disponível"
              : "produtos disponíveis"}
          </span>
        </div>
        <nav aria-label="Coleções" className="collection-filters">
          <Link
            className="button secondary"
            aria-current={!collectionId ? "page" : undefined}
            href="/portfolio"
          >
            Todos
          </Link>
          {collections.map((c) => (
            <Link
              className="button secondary"
              key={c.id}
              aria-current={collectionId === c.id ? "page" : undefined}
              href={`/portfolio?colecao=${encodeURIComponent(c.id)}`}
            >
              {c.imageUrl ? (
                <Image
                  src={c.imageUrl}
                  width={48}
                  height={48}
                  unoptimized
                  alt=""
                />
              ) : (
                <Box size={24} aria-hidden="true" />
              )}
              {c.name}
            </Link>
          ))}
        </nav>
        {collections.find((c) => c.id === collectionId)?.description && (
          <p>{collections.find((c) => c.id === collectionId)?.description}</p>
        )}
        <ProductCatalog products={products} />
      </main>
      <footer className="portfolio-footer">
        <div>
          {identity.footer}
          {identity.email && (
            <p>
              <a href={`mailto:${identity.email}`}>{identity.email}</a>
            </p>
          )}
          {identity.phone && <p>{identity.phone}</p>}
          {identity.address && <p>{identity.address}</p>}
        </div>
        <span>Valores em reais · BRL</span>
      </footer>
    </div>
  );
}
