import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Box } from "lucide-react";
import { Brand } from "@/components/shell/app-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { listPublicProducts } from "@/server/products";
import { listPublicCollections } from "@/server/collections";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portfólio de produtos | B2T Print Studio",
  description:
    "Conheça nossas peças de impressão 3D, preços e formas de pagamento.",
};
export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ colecao?: string | string[] }>;
}) {
  const query = (await searchParams).colecao;
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
        <Link href="/portfolio" aria-label="B2T portfólio">
          <Brand />
        </Link>
        <Link href="/produtos" className="button secondary">
          Área da equipe <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="portfolio-main">
        <section className="portfolio-hero">
          <div>
            <div className="eyebrow">B2T PRINT STUDIO · PORTFÓLIO</div>
            <h1>
              Ideias que ganham <span>forma.</span>
            </h1>
            <p>
              Conheça nossas peças, feitas camada por camada.
              <br />
              Design, cuidado e possibilidades em cada impressão.
            </p>
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
              {c.imageUrl ? <Image src={c.imageUrl} width={48} height={48} unoptimized alt=""/> : <Box size={24} aria-hidden="true"/>}
              {c.name}
            </Link>
          ))}
        </nav>
        {collections.find(c=>c.id===collectionId)?.description && <p>{collections.find(c=>c.id===collectionId)?.description}</p>}
        <ProductCatalog products={products} />
      </main>
      <footer className="portfolio-footer">
        B2T · Precisão em cada camada.<span>Valores em reais · BRL</span>
      </footer>
    </div>
  );
}
