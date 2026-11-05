import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { ProductForm } from "@/components/products/product-form";
import { QuoteForm } from "@/components/commerce/quote-form";
import { QuotePanel } from "@/components/commerce/quote-panel";
import { SalePanel } from "@/components/commerce/sale-panel";
import { EntryForm } from "@/components/finance/entry-form";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { CustomerPanel } from "@/components/customers/customer-panel";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { pricingCatalog } from "./fixtures/pricing-catalog";
import { Button } from "@/components/ui/button";
import { calculatorData, productDTO } from "./fixtures/product";
import "@/app/design.css";

// Visual fixture only. This Vite preview has no API or production database.
function Preview() {
  const [view, setView] = useState("Produtos");
  const [width, setWidth] = useState("auto");
  const [role, setRole] = useState<"ADMIN" | "OPERATOR">("ADMIN");
  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 12,
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <strong>Prévia local · dados de teste</strong>
        {[
          "Produtos",
          "Calculadora",
          "Orçamentos",
          "Lista orçamentos",
          "Vendas",
          "Financeiro",
          "Configurações",
          "Clientes",
        ].map((name) => (
          <Button
            key={name}
            size="sm"
            variant={view === name ? "default" : "outline"}
            onClick={() => setView(name)}
          >
            {name}
          </Button>
        ))}
        <label>
          Perfil{" "}
          <select
            aria-label="Perfil da prévia"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "ADMIN" | "OPERATOR")
            }
          >
            <option value="ADMIN">Administrador</option>
            <option value="OPERATOR">Operador</option>
          </select>
        </label>
        <label>
          Largura{" "}
          <select
            aria-label="Largura da prévia"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
          >
            <option value="auto">Janela</option>
            <option value="390px">Celular · 390 px</option>
            <option value="1366px">Computador · 1366 px</option>
            <option value="1920px">Computador · 1920 px</option>
          </select>
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            (document.documentElement.dataset.theme =
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark")
          }
        >
          Alternar tema
        </Button>
      </div>
      <div style={{ width, maxWidth: "none" }}>
        <AppShell
          actor={{
            id: "preview",
            name: "Equipe de teste",
            email: "preview@example.test",
            role,
          }}
        >
          <div className="page-heading">
            <div>
              <h1>{view}</h1>
              <p>Revisão visual com os componentes reais do administrativo.</p>
            </div>
          </div>
          {view === "Calculadora" && (
            <CalculatorWorkspace
              data={calculatorData}
              catalog={pricingCatalog}
              role="ADMIN"
            />
          )}
          {view === "Produtos" && (
            <ProductForm
              product={productDTO}
              data={calculatorData}
              role="ADMIN"
              onSaved={() => {}}
              onCancel={() => {}}
            />
          )}
          {view === "Orçamentos" && (
            <QuoteForm
              customers={[]}
              products={[]}
              onSaved={() => {}}
              onCancel={() => {}}
            />
          )}
          {view === "Lista orçamentos" && (
            <QuotePanel
              initial={{ items: [], total: 0, page: 1, pageSize: 20 }}
              customers={[]}
              products={[]}
              filters={{ search: "", status: "all" }}
            />
          )}
          {view === "Vendas" && (
            <SalePanel
              initial={{ items: [], total: 0, page: 1, pageSize: 20 }}
              customers={[]}
              products={[]}
              filters={{ search: "", status: "all" }}
            />
          )}
          {view === "Financeiro" && (
            <EntryForm categories={[]} onDone={() => {}} onCancel={() => {}} />
          )}
          {view === "Configurações" && (
            <SettingsPanel
              initialData={{
                materials: [],
                printers: [],
                users: [],
                settings: null,
              }}
            />
          )}
          {view === "Clientes" && (
            <CustomerPanel
              initial={{ items: [], total: 0, page: 1, pageSize: 20 }}
              search=""
              active="all"
            />
          )}
        </AppShell>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
