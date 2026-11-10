import { permanentRedirect } from "next/navigation";
import { after } from "next/server";
import Link from "next/link";
import {
  legacyCatalogDestination,
  type CatalogQuery,
} from "@/domain/products/catalog-navigation";
import { getPublicAppearance } from "@/server/appearance";
import { featuredCollections, publicMetadata } from "@/server/storefront";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { StoreWelcome } from "@/components/products/store-welcome";
import {
  StoreAbout,
  StoreBanners,
  StoreFeatured,
  StoreKits,
} from "@/components/products/storefront-sections";
import { StoreCollections } from "@/components/products/store-collections";
import { listPublicCollections } from "@/server/collections";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { Button } from "@/components/ui/button";
import { listPublicKits } from "@/server/kits/queries";
import { appUrl } from "@/lib/env";
import { safeJsonLd } from "@/domain/products/storefront";
import { StoreInstagram } from "@/components/products/store-instagram";
import {
  instagramPosts,
  instagramSyncDue,
  syncInstagram,
} from "@/server/instagram";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<CatalogQuery> };
export async function generateMetadata() {
  const identity = await getPublicAppearance();
  return publicMetadata(
    `${identity.name} | Ideias em 3D`,
    "Produtos personalizados, presentes e ideias em 3D. Conheça a B2T e explore o catálogo para preparar seu orçamento.",
    "/",
    "/brand/b2t-logo.png",
    identity.storefront?.seo,
  );
}
export default async function HomePage({ searchParams }: Props) {
  const destination = legacyCatalogDestination(await searchParams);
  if (destination) permanentRedirect(destination);
  const [identity, collections, kits] = await Promise.all([
    getPublicAppearance(),
    listPublicCollections(),
    listPublicKits(),
  ]);
  const config = identity.storefront ?? defaultStorefront;
  if (instagramSyncDue(config.instagram))
    after(() => syncInstagram().catch(() => undefined));
  const featured = await featuredCollections(config.featuredCollectionIds);
  const hasBanner = config.banners.some(
    (b) => !b.collectionId || collections.some((c) => c.id === b.collectionId),
  );
  const sections = {
    banners: <StoreBanners config={config} collections={collections} />,
    featured: (
      <StoreFeatured
        collections={featured.map((c) => ({
          ...c,
          slug: collections.find((item) => item.id === c.id)?.slug,
        }))}
      />
    ),
    catalog: (
      <section id="all-products" aria-label="Explorar catálogo">
        <StoreCollections collections={collections} />
        <Button asChild>
          <Link href="/catalogo">Explorar catálogo completo</Link>
        </Button>
        <StoreKits kits={kits} />
      </section>
    ),
    about: <StoreAbout config={config} />,
  };
  return (
    <StorefrontShell identity={identity}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: identity.name,
                url: appUrl().href,
                logo: new URL("/brand/b2t-logo.png", appUrl()).href,
                sameAs: ["https://www.instagram.com/somosb2t/"],
              },
              {
                "@type": "WebSite",
                name: identity.name,
                url: appUrl().href,
                inLanguage: "pt-BR",
              },
            ],
          }),
        }}
      />
      {config.showHero ? (
        hasBanner ? (
          <StoreBanners config={config} collections={collections} focal />
        ) : (
          <StoreWelcome />
        )
      ) : (
        <div className="store-heading">
          <div>
            <h1>{identity.name} · Ideias em 3D</h1>
            <p>Produtos personalizados e presentes com a sua personalidade.</p>
            <Button asChild>
              <Link href="/catalogo">Explorar catálogo</Link>
            </Button>
          </div>
        </div>
      )}
      {config.instagram?.enabled !== false && (
        <StoreInstagram posts={instagramPosts(config.instagram)} />
      )}
      <section className="store-about" aria-labelledby="home-process">
        <h2 id="home-process">Da escolha ao orçamento</h2>
        <ol className="landing-process">
          <li>
            <strong>Explore as possibilidades</strong>
            <p>Veja fotos, opções e informações dos produtos no catálogo.</p>
          </li>
          <li>
            <strong>Dê seu toque</strong>
            <p>
              Escolha as opções disponíveis e adicione os produtos à lista de
              orçamento.
            </p>
          </li>
          <li>
            <strong>Envie sua solicitação</strong>
            <p>
              Revise sua lista e envie o pedido de orçamento. As condições são
              confirmadas no atendimento.
            </p>
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/catalogo">Explorar catálogo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portfolio/orcamento">Solicitar orçamento</Link>
          </Button>
        </div>
      </section>
      {config.sectionOrder.map((section) => (
        <div key={section}>{sections[section]}</div>
      ))}
    </StorefrontShell>
  );
}
