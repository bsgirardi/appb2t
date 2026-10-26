import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  permittedPanels,
  dashboardPanels,
  type DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
import { Button } from "@/components/ui/button";
import "@/app/design.css";

// Visual fixture only. No database, session, API, or production data.
function Preview() {
  const [, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("popstate", refresh);
    return () => window.removeEventListener("popstate", refresh);
  }, []);
  const [width, setWidth] = useState("auto"),
    [role, setRole] = useState<"ADMIN" | "OPERATOR">("ADMIN");
  const f = resolveDashboardFilter(
    Object.fromEntries(new URLSearchParams(window.location.search)),
    role,
    new Date("2026-10-26T15:00:00Z"),
  );
  const selected = dashboardPanels.find((p) => p.id === f.panel)!;
  const data: DashboardPanelDTO = {
    metrics: [
      {
        id: "sales",
        label: "Vendas no período",
        value: "18450.30",
        previous: "15200.00",
        unit: "money",
        description:
          "Vendas criadas no período, exceto rascunhos e canceladas.",
        href: "/vendas",
      },
      {
        id: "backlog",
        label: "Carteira em aberto",
        value: "6230",
        unit: "money",
        description: "Valor dos pedidos ainda não entregues.",
      },
      {
        id: "orders",
        label: "Ordens em produção",
        value: "12",
        unit: "number",
        description: "Posição atual: liberadas e em execução.",
      },
      {
        id: "late",
        label: "Ordens atrasadas",
        value: "2",
        unit: "number",
        description: "Ordens ativas com prazo vencido.",
      },
      {
        id: "margin",
        label: "Margem realizada",
        value: null,
        unit: "percent",
        description: "Contribuição sobre receita coberta.",
        reason: "Custos incompletos para os pedidos desta seleção.",
        coverage: "2/5 pedidos com custo completo",
      },
      {
        id: "zero",
        label: "Reimpressões",
        value: "0",
        unit: "number",
        description: "Nenhum apontamento de reimpressão no período.",
      },
    ],
    charts: [
      {
        id: "sales",
        title: "Evolução das vendas",
        description:
          "Dados ilustrativos para verificar a apresentação dos gráficos.",
        kind: "area",
        unit: "money",
        keys: [{ key: "value", label: "Vendas" }],
        points: [
          { label: "2026-10-01", value: "1200" },
          { label: "2026-10-05", value: "2200" },
          { label: "2026-10-10", value: "1800" },
          { label: "2026-10-15", value: "3300" },
          { label: "2026-10-20", value: "2500" },
          { label: "2026-10-26", value: "4200" },
        ],
      },
      {
        id: "orders",
        title: "Produção em andamento",
        description: "Distribuição de ordens por etapa.",
        kind: "bar",
        unit: "number",
        keys: [{ key: "value", label: "Ordens" }],
        points: [
          { label: "Liberada", value: "8" },
          { label: "Em execução", value: "4" },
        ],
      },
    ],
    priorities: Array.from({ length: 13 }, (_, i) => ({
      id: String(i),
      title: i < 2 ? `Ordem #${100 + i} atrasada` : `Pedido #${100 + i}`,
      detail:
        i < 2
          ? "Prazo 24/10/2026 · aguardando conclusão"
          : "Entrega próxima · conferir produção e materiais",
      severity: i < 2 ? "urgent" : "attention",
      href: "/producao",
    })),
    tables: [
      {
        id: "products",
        title: "Produtos mais vendidos",
        description: "Itens de teste para conferir a tabela e os vínculos.",
        columns: ["Produto", "Quantidade", "Valor bruto"],
        rows: [
          {
            id: "a",
            cells: ["Suporte articulado personalizado", "28", "R$ 4.200,00"],
          },
          { id: "b", cells: ["Kit organizador de mesa", "15", "R$ 2.850,00"] },
        ],
      },
    ],
    notes: [
      "Prévia com dados de teste. Os dashboards reais consultam os registros existentes e respeitam as permissões.",
    ],
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <strong>Prévia local · dados de teste</strong>
        <label>
          Largura{" "}
          <select
            aria-label="Largura da prévia"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          >
            <option value="auto">Janela</option>
            <option value="390px">390 px</option>
            <option value="1366px">1366 px</option>
            <option value="1920px">1920 px</option>
            <option value="683px">Zoom 200% · equivalente 683 px</option>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRole(role === "ADMIN" ? "OPERATOR" : "ADMIN")}
        >
          Perfil: {role}
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
          <section className="dashboard-workspace flex min-w-0 flex-col gap-6">
            <div className="page-heading mb-0">
              <div>
                <h1>{selected.label}</h1>
                <p>{selected.description}</p>
              </div>
              <p>Atualizado em 26/10/2026</p>
            </div>
            <DashboardToolbar filter={f} panels={permittedPanels(role)} />
            <DashboardPanel data={data} />
          </section>
        </AppShell>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
