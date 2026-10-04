import Image from "next/image";
import Link from "next/link";
import type { StorefrontConfig } from "@/domain/appearance/storefront";
import type { PublicCollectionDTO } from "@/domain/collections/types";
import type { PublicProductDTO } from "@/domain/products/types";
import { ProductCatalog } from "./product-catalog";
export function StoreBanners({
  config,
  collections,
}: {
  config: StorefrontConfig;
  collections: PublicCollectionDTO[];
}) {
  const banners = config.banners.filter(
    (b) => !b.collectionId || collections.some((c) => c.id === b.collectionId),
  );
  if (!banners.length) return null;
  return (
    <section className="store-banners" aria-label="Destaques da loja">
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
              <h2>{banner.title}</h2>
              {banner.text && <p>{banner.text}</p>}
              <Link
                href={
                  collection
                    ? `/?colecao=${encodeURIComponent(collection.id)}`
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
        <Link href={`/?colecao=${encodeURIComponent(collection.id)}`}>
          Ver coleção →
        </Link>
      </div>
      <ProductCatalog
        products={collection.products}
        context={{
          collection: collection.id,
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
