import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { PosPanel } from "@/components/pos/pos-panel";
import { previewProducts } from "./pos-preview-api";
import "@/app/design.css";
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "preview-pdv",
      name: "Prévia sintética",
      email: "pdv@example.test",
      role: "OPERATOR",
    }}
  >
    <PosPanel initialOrder={null} initialProducts={previewProducts} />
  </AppShell>,
);
