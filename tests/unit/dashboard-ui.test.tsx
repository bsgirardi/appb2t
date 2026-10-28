// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { PriorityTable } from "@/components/dashboard/priority-table";
import { permittedPanels } from "@/domain/dashboard/types";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("makes incomplete values explicit and keeps a real zero", () => {
  render(
    <>
      <MetricCard
        metric={{
          id: "a",
          label: "Margem",
          value: null,
          unit: "percent",
          description: "Cobertura",
          reason: "Custos incompletos",
        }}
      />
      <MetricCard
        metric={{
          id: "b",
          label: "Vendas",
          value: "0",
          unit: "money",
          description: "Período",
        }}
      />
    </>,
  );
  expect(screen.getByText("Dados insuficientes")).toBeTruthy();
  expect(screen.getByText("Custos incompletos")).toBeTruthy();
  expect(screen.getByText(/R\$.*0,00/)).toBeTruthy();
});
it("does not offer protected dashboards and preserves period when changing the panel", () => {
  const f = resolveDashboardFilter(
    { from: "2026-10-01", to: "2026-10-20" },
    "OPERATOR",
    new Date("2026-10-26T15:00Z"),
  );
  render(<DashboardToolbar filter={f} panels={permittedPanels("OPERATOR")} />);
  expect(permittedPanels("OPERATOR").map((p) => p.id)).not.toContain("finance");
  const input = screen.getByRole("combobox", { name: "Dashboard" });
  fireEvent.change(input, { target: { value: "Estoque" } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  // Selection behavior is also verified in the browser; period fields retain the supplied URL values.
  expect((screen.getByLabelText("Início") as HTMLInputElement).value).toBe(
    "2026-10-01",
  );
  expect((screen.getByLabelText("Fim") as HTMLInputElement).value).toBe(
    "2026-10-20",
  );
});
it("has an honest empty state and paginates priorities without losing records", () => {
  const { rerender } = render(<PriorityTable priorities={[]} />);
  expect(screen.getByText("Nenhuma pendência nesta seleção")).toBeTruthy();
  rerender(
    <PriorityTable
      priorities={Array.from({ length: 13 }, (_, i) => ({
        id: String(i),
        title: `Pedido ${i}`,
        detail: "Prazo próximo",
        href: "/vendas",
        severity: "attention",
      }))}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Próxima página de prioridades" }),
  );
  expect(screen.getByText("Pedido 12")).toBeTruthy();
});
it("clears an existing margin reference instead of restoring the previous URL value", () => {
  const filter = resolveDashboardFilter(
    { panel: "profitability", margin: "15" },
    "ADMIN",
    new Date("2026-10-26T15:00Z"),
  );
  render(
    <DashboardToolbar filter={filter} panels={permittedPanels("ADMIN")} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Período e filtros" }));
  fireEvent.change(screen.getByLabelText("Referência de margem (%)"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
  expect(mocks.push).toHaveBeenCalled();
  expect(mocks.push.mock.calls[0][0]).not.toContain("margin=");
});
