import { catalogPath } from "@/domain/products/catalog-navigation";
import Image from "next/image";
import Link from "next/link";
import type { StorefrontConfig } from "@/domain/appearance/storefront";
import type { PublicCollectionDTO } from "@/domain/collections/types";
import type { PublicProductDTO } from "@/domain/products/types";
import { ProductCatalog } from "./product-catalog";
import type { KitDTO } from "@/domain/kits/types";
export function StoreKits({ kits }: { kits: KitDTO[] }) {
  if (!kits.length) return null;
  return (
    <section className="store-kits" aria-labelledby="store-kits-heading">
      <div className="store-section-heading">
        <div>
          <h2 id="store-kits-heading">Monte seu conjunto</h2>
          <p>
            Combine peças permitidas, personalize e confira os descontos do kit.
          </p>
        </div>
      </div>
      <div className="store-kits-list">
        {kits.map((kit) => (
          <article key={kit.id}>
            <h3>{kit.name}</h3>
            {kit.description && <p>{kit.description}</p>}
            <Link
              className="inline-flex min-h-11 items-center"
              href={`/portfolio/conjuntos/${encodeURIComponent(kit.id)}`}
            >
              Montar {kit.name}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
export function StoreBanners({
  config,
  collections,
  focal = false,
}: {
  config: StorefrontConfig;
  focal?: boolean;
  collections: PublicCollectionDTO[];
}) {
  const valid = config.banners.filter(
    (b) => !b.collectionId || collections.some((c) => c.id === b.collectionId),
  );
  const banners = focal ? valid.slice(0, 1) : valid.slice(1);
  if (!banners.length) return null;
  return (
    <section
      className={focal ? "store-banners store-banners-focal" : "store-banners"}
      aria-label="Destaques da loja"
    >
      {banners.map((banner, index) => {
        const collection = collections.find(
          (c) => c.id === banner.collectionId,
        );
        return (
          <article
            className={`store-banner${collection?.imageUrl ? "" : " store-banner-text"}`}
            key={index}
          >
            <div>
              {focal ? <h1>{banner.title}</h1> : <h2>{banner.title}</h2>}
              {banner.text && <p>{banner.text}</p>}
              <Link
                href={
                  collection
                    ? catalogPath(collection.slug ?? collection.id)
                    : "#all-products"
                }
              >
                {banner.buttonText} <span aria-hidden="true">→</span>
              </Link>
            </div>
            {collection?.imageUrl && (
              <Image
                src={collection.imageUrl}
                alt={collection.name}
                width={720}
                height={480}
                unoptimized
                loading={index === 0 ? "eager" : "lazy"}
              />
            )}
          </article>
        );
      })}
    </section>
  );
}
export function StoreFeatured({
  collections,
}: {
  collections: {
    id: string;
    slug?: string;
    name: string;
    description: string;
    products: PublicProductDTO[];
  }[];
}) {
  return collections.map((collection) => (
    <section
      className="store-featured"
      key={collection.id}
      aria-labelledby={`featured-${collection.id}`}
    >
      <div className="store-section-heading">
        <div>
          <h2 id={`featured-${collection.id}`}>{collection.name}</h2>
          {collection.description && <p>{collection.description}</p>}
        </div>
        <Link href={catalogPath(collection.slug ?? collection.id)}>
          Ver coleção →
        </Link>
      </div>
      <ProductCatalog
        products={collection.products}
        context={{
          collection: collection.slug ?? collection.id,
          search: "",
          order: "nome",
          page: 1,
        }}
      />
    </section>
  ));
}
export function StoreAbout({ config }: { config: StorefrontConfig }) {
  return config.aboutText ? (
    <section className="store-about">
      <h2>{config.aboutTitle || "Sobre a loja"}</h2>
      <p>{config.aboutText}</p>
    </section>
  ) : null;
}
