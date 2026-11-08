import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { PosPanel } from "@/components/pos/pos-panel";
import { previewProducts, initializePreviewOrder } from "./pos-preview-api";
import "@/app/design.css";
import { useEffect } from "react";
import { emptyPosDraft, type PosOrderDTO } from "@/domain/pos/types";

// Cenários locais explícitos: sem backend, sessão ou persistência operacional.
const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario");
document.documentElement.dataset.theme =
  params.get("theme") === "light" ? "light" : "dark";
const products = (scenario === "catalog-empty" ? [] : previewProducts).map(
  (p, index) => ({
    ...p,
    name:
      scenario === "long" && index === 0
        ? "Peça personalizada para atendimento com descrição muito extensa e referênciaSemEspaços".repeat(
            3,
          )
        : p.name,
  }),
);
const initialOrder: PosOrderDTO | null = [
  "long",
  "error",
  "pending",
  "filled",
].includes(scenario ?? "")
  ? {
      id: "synthetic-order",
      version: 1,
      updatedAt: "2026-11-07T12:00:00Z",
      receipt: null,
      input: {
        ...emptyPosDraft,
        items: [
          {
            productId: products[0].id,
            quantity: 2,
            unitPrice: products[0].price,
            commercialRevision: 1,
          },
        ],
      },
    }
  : null;
initializePreviewOrder(initialOrder);
function Preview() {
  useEffect(() => {
    if (scenario === "error" || scenario === "pending") {
      document
        .querySelector<HTMLFormElement>(".pos-workspace form")
        ?.requestSubmit();
    }
  }, []);
  return <PosPanel initialOrder={initialOrder} initialProducts={products} />;
}
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "preview-pdv",
      name: "Prévia sintética",
      email: "pdv@example.test",
      role: "OPERATOR",
    }}
  >
    <Preview />
  </AppShell>,
);
