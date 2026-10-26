export const dashboardPanels = [
  {
    id: "overview",
    label: "Visão geral",
    description: "O ritmo da operação e o que precisa da sua atenção.",
  },
  {
    id: "commercial",
    label: "Comercial",
    description: "Da solicitação à entrega: acompanhe cada oportunidade.",
  },
  {
    id: "production",
    label: "Produção",
    description: "Prazos, qualidade e capacidade da sua produção.",
  },
  {
    id: "stock",
    label: "Estoque",
    description: "Materiais disponíveis e cobertura dos próximos trabalhos.",
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Compromissos, movimentações e perspectiva de caixa.",
  },
  {
    id: "profitability",
    label: "Rentabilidade",
    description:
      "Entenda o resultado e a cobertura dos custos de cada trabalho.",
  },
] as const;
export type DashboardPanel = (typeof dashboardPanels)[number]["id"];
export type DashboardFilter = {
  panel: DashboardPanel;
  from: string;
  to: string;
  today: string;
  previousFrom: string;
  previousTo: string;
  range: "month" | "30" | "90" | "custom";
  margin?: string;
};
export type Metric = {
  id: string;
  label: string;
  value: string | null;
  unit: "money" | "number" | "percent" | "hours" | "days";
  description: string;
  href?: string;
  previous?: string | null;
  coverage?: string;
  reason?: string;
};
export type Series = {
  id: string;
  title: string;
  description: string;
  kind: "area" | "bar";
  unit: Metric["unit"];
  keys: { key: string; label: string }[];
  points: { label: string; [key: string]: string | null }[];
};
export type Priority = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "urgent" | "attention" | "info";
};
export type DataTable = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: { id: string; cells: string[]; href?: string }[];
};
export type DashboardPanelDTO = {
  metrics: Metric[];
  charts: Series[];
  priorities: Priority[];
  tables: DataTable[];
  notes: string[];
};
export function permittedPanels(role: "ADMIN" | "OPERATOR") {
  return dashboardPanels.filter(
    (p) => role === "ADMIN" || !["finance", "profitability"].includes(p.id),
  );
}
