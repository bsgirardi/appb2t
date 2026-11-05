import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { HistoryProtection } from "@/components/history-protection";
import { QuoteForm } from "@/components/commerce/quote-form";
import { SaleForm } from "@/components/commerce/sale-form";
import { Button } from "@/components/ui/button";
import "@/app/design.css";

// Isolated fixture only: force the browser fallback without changing production.
Object.defineProperty(window, "navigation", {
  configurable: true,
  value: undefined,
});
function Preview() {
  const read = () => new URLSearchParams(location.search).get("view") ?? "list";
  const [view, setView] = useState(read);
  function open(next: string) {
    history.pushState(
      { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { view: next } },
      "",
      `?view=${next}&search=Ana&page=2`,
    );
    setView(next);
  }
  useEffect(() => {
    const restore = () => setView(read());
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  return (
    <div className="admin-ui admin-theme font-admin min-h-screen bg-background p-4 text-foreground">
      <HistoryProtection />
      <main className="mx-auto flex max-w-5xl flex-col gap-4">
        <h1>Proteção de histórico · dados fictícios</h1>
        <p>
          Navigation API desativada nesta prévia. Nenhuma API ou banco
          conectado.
        </p>
        <nav className="flex flex-wrap gap-2" aria-label="Histórico de teste">
          <Button onClick={() => history.back()}>Voltar</Button>
          <Button onClick={() => history.forward()}>Avançar</Button>
          <Button onClick={() => history.go(-2)}>Voltar duas páginas</Button>
        </nav>
        {view === "list" ? (
          <section>
            <h2>Lista de teste · Ana · página 2</h2>
            <div className="flex gap-2">
              <Button onClick={() => open("quote")}>
                Abrir orçamento de teste
              </Button>
              <Button onClick={() => open("sale")}>Abrir venda de teste</Button>
            </div>
          </section>
        ) : (
          <>
            <a href="#notes">Ir para referência na mesma tela</a>
            <div id="notes">Referência de teste</div>
            {view === "quote" ? (
              <QuoteForm
                key="quote"
                title="Orçamento de teste"
                customers={[]}
                products={[]}
                onCancel={() => open("list")}
                onSaved={() => open("list")}
              />
            ) : (
              <SaleForm
                key="sale"
                customers={[]}
                products={[]}
                onCancel={() => open("list")}
                onSaved={() => open("list")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
