import { productPath } from "./storefront";
import type { PublicProductDTO } from "./types";

export type CatalogQuery = Record<string, string | string[] | undefined>;
export type CatalogFilters = {
  collection: string;
  search: string;
  order: string;
  page: number;
};

export function catalogFilters(query: CatalogQuery): CatalogFilters {
  const one = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : "";
  const rawPage = one("pagina");
  return {
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
) {
  const params = new URLSearchParams();
  if (collection) params.set("colecao", collection);
  if (search) params.set("busca", search);
  if (order !== "nome") params.set("ordem", order);
  if (page > 1) params.set("pagina", String(page));
  return `/${params.size ? `?${params}` : ""}`;
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
  ).slice(1);
  return productPath(product) + query;
}
