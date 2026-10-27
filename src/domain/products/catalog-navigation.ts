import { productPath } from "./storefront";
import type { PublicProductDTO } from "./types";
import type { CatalogCommercialFilters } from "./catalog-commercial-filters";

export type CatalogQuery = Record<string, string | string[] | undefined>;
export type CatalogFilters = CatalogCommercialFilters & {
  collection: string;
  search: string;
  order: string;
  page: number;
};

export function catalogFilters(query: CatalogQuery): CatalogFilters {
  const one = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : "";
  const rawPage = one("pagina");
  const commercialValue = (key: string) =>
    Array.isArray(query[key])
      ? "Valores repetidos — informe um único valor."
      : one(key);
  return {
    ...(commercialValue("precoMin")
      ? { priceMin: commercialValue("precoMin") }
      : {}),
    ...(commercialValue("precoMax")
      ? { priceMax: commercialValue("precoMax") }
      : {}),
    ...(commercialValue("disponibilidade")
      ? { availability: commercialValue("disponibilidade") }
      : {}),
    collection: one("colecao").slice(0, 100),
    search: one("busca").trim().slice(0, 100),
    order: ["menor-preco", "maior-preco", "recentes"].includes(one("ordem"))
      ? one("ordem")
      : "nome",
    page: /^\d{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1,
  };
}

export function catalogPath(
  collection = "",
  search = "",
  order = "nome",
  page = 1,
  commercial: CatalogCommercialFilters = {},
) {
  const params = new URLSearchParams();
  if (collection) params.set("colecao", collection);
  if (search) params.set("busca", search);
  if (order !== "nome") params.set("ordem", order);
  if (page > 1) params.set("pagina", String(page));
  if (commercial.priceMin) params.set("precoMin", commercial.priceMin);
  if (commercial.priceMax) params.set("precoMax", commercial.priceMax);
  if (commercial.availability)
    params.set("disponibilidade", commercial.availability);
  return `/${params.size ? `?${params}` : ""}`;
}
export function catalogContextPath(
  context: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
) {
  const f = { ...context, ...overrides };
  return catalogPath(f.collection, f.search, f.order, f.page, f);
}
export function productEditPath(
  product: Pick<PublicProductDTO, "id" | "name">,
  context: CatalogFilters | undefined,
  lineId: string,
) {
  const path = productBrowsePath(product, context);
  return `${path}${path.includes("?") ? "&" : "?"}editar=${encodeURIComponent(lineId)}`;
}

// Only catalog filters travel with the visitor; never accept an arbitrary return URL.
export function productBrowsePath(
  product: Pick<PublicProductDTO, "id" | "name">,
  context?: CatalogFilters,
) {
  if (!context) return productPath(product);
  const query = catalogPath(
    context.collection,
    context.search,
    context.order,
    context.page,
    context,
  ).slice(1);
  return productPath(product) + query;
}
