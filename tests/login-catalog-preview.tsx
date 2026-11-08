import { createRoot } from "react-dom/client";
import Login from "@/app/login/page";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { StoreWelcome } from "@/components/products/store-welcome";
import { CatalogFilterForm } from "@/components/products/catalog-filter-form";
import {
  ActiveCatalogFilters,
  CollectionNavigation,
} from "@/components/products/store-collections";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getPublicAppearance } from "./login-catalog-preview-appearance";
import { productDTO } from "./fixtures/product";
import "@/app/design.css";
const params = new URLSearchParams(location.search);
if (params.get("theme") !== "auto")
  document.documentElement.dataset.theme = params.get("theme") ?? "light";
const context = {
  search: params.has("filtered") ? "Peça de demonstração com nome longo" : "",
  collection: "",
  order: "nome",
  page: 1,
  ...(params.has("filtered")
    ? {
        priceMin: params.has("invalid") ? "abc" : "0",
        availability: "AVAILABLE",
      }
    : {}),
};
const portrait =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#E9EDF2"/><rect x="45" y="35" width="110" height="330" rx="25" fill="#0066CC"/></svg>',
  );
const landscape =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="180"><rect x="10" y="10" width="480" height="160" rx="40" fill="#FF7A00"/></svg>',
  );
const products = [
  {
    ...productDTO,
    id: "preview-one",
    name: "Peça de demonstração com nome longo para avaliar quebra e leitura",
    images: [{ id: "synthetic-portrait", url: portrait, position: 0 }],
    availability: "AVAILABLE" as const,
  },
  {
    ...productDTO,
    id: "preview-two",
    name: "Produto sintético sob consulta",
    price: null,
    images: [{ id: "synthetic-landscape", url: landscape, position: 0 }],
    availability: "CONSULT" as const,
  },
  {
    ...productDTO,
    id: "preview-three",
    name: "Produção sob encomenda",
    price: "0.00",
    images: [],
    availability: "MADE_TO_ORDER" as const,
    minimumQuantity: 12,
  },
];
const identity = await getPublicAppearance();
createRoot(document.getElementById("root")!).render(
  params.get("view") === "login" ? (
    await Login({
      searchParams: Promise.resolve(
        params.has("changed") ? { changed: "1" } : {},
      ),
    })
  ) : (
    <StorefrontShell
      identity={identity}
      search={context.search}
      commercial={context}
    >
      {!params.has("filtered") && <StoreWelcome />}
      <CollectionNavigation collections={[]} context={context} />
      <section id="all-products">
        <div className="store-heading">
          <h1>Produtos de demonstração</h1>
          <span>{params.has("empty") ? "0" : "3"} produtos</span>
        </div>
        <ActiveCatalogFilters context={context} />
        <CatalogFilterForm context={context} collections={[]} />
        <ProductCatalog
          context={context}
          products={params.has("empty") ? [] : products}
        />
      </section>
    </StorefrontShell>
  ),
);
