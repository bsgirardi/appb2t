import type { PublicProductDTO } from "./types";
export function productStructuredData(
  product: PublicProductDTO,
  company: string,
  url: string,
): object {
  const variable = product.configuration?.fields.some((f) =>
    f.type === "SINGLE_CHOICE"
      ? f.options.some((o) => o.effect.kind !== "NONE")
      : f.effect.kind !== "NONE",
  );
  return {
    "@type": "Product",
    name: product.name,
    ...(product.sku ? { sku: product.sku } : {}),
    description: product.description,
    url,
    image: product.images.map((i) => new URL(i.url, url).href),
    ...(product.price !== null &&
    product.publicPriceMode !== "CONSULT" &&
    !variable
      ? {
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
            seller: { "@type": "Organization", name: company },
          },
        }
      : {}),
  };
}
