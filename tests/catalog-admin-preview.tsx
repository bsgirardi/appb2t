import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { ProductPanel } from "@/components/products/product-panel";
import { KitPanel } from "@/components/kits/kit-panel";
import { calculatorData, productDTO } from "./fixtures/product";
import "@/app/design.css";

// Fixtures only: no API, authentication session or operational database.
const params = new URLSearchParams(window.location.search);
const role = params.get("role") === "OPERATOR" ? "OPERATOR" : "ADMIN";
const products = [
  {
    ...productDTO,
    name: "Vaso geométrico",
    imageUrl: "/brand/b2t-logo.png",
    images: [{ ...productDTO.images[0], url: "/brand/b2t-logo.png" }],
  },
  {
    ...productDTO,
    id: "p2",
    name: "Porta-retrato Coração",
    active: false,
    price: "32.00",
    imageUrl: "/brand/b2t-logo.png",
  },
];
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "fixture",
      name: "Equipe de demonstração",
      email: "fixture@example.test",
      role,
    }}
  >
    {params.get("view") === "kits" ? (
      <KitPanel
        initialKits={[
          {
            id: "k1",
            name: "Kit boas-vindas",
            description: "Peças personalizadas para presentear.",
            active: true,
            position: 0,
            version: 1,
            commercialRevision: 1,
            productIds: [productDTO.id],
            tiers: [{ minQuantity: 10, kind: "PERCENT", percent: "5" }],
          },
          {
            id: "k2",
            name: "Kit escritório",
            description: "Conjunto em preparação.",
            active: false,
            position: 1,
            version: 1,
            commercialRevision: 1,
            productIds: [],
            tiers: [],
          },
        ]}
        products={products}
      />
    ) : (
      <ProductPanel products={products} data={calculatorData} role={role} />
    )}
  </AppShell>,
);
