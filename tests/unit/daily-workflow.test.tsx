// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  api: vi.fn(),
}));
vi.mock("@/lib/client-api", () => ({ api: mocks.api }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
vi.mock("@/components/dashboard/dashboard-chart", () => ({
  DashboardChart: () => <h2>Gráfico de teste</h2>,
}));
import { CustomerPanel } from "@/components/customers/customer-panel";
import { CustomerForm } from "@/components/customers/customer-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { permittedPanels } from "@/domain/dashboard/types";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
import { ContextEditor } from "@/components/admin/context-editor";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const initial = { items: [], page: 1, pageSize: 25, total: 60 };
it("paginates with applied filters, then synchronizes drafts with incoming URL values", () => {
  const view = render(
    <CustomerPanel initial={initial} search="Ana" active="true" />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText("Buscar cliente"), {
    target: { value: "Rascunho" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  expect(mocks.push).toHaveBeenLastCalledWith(
    "/clientes?search=Ana&active=true&page=2",
  );
  view.rerender(
    <CustomerPanel initial={initial} search="Bruno" active="false" />,
  );
  expect(
    (screen.getByLabelText("Buscar cliente") as HTMLInputElement).value,
  ).toBe("Bruno");
  expect((screen.getByLabelText("Situação") as HTMLSelectElement).value).toBe(
    "false",
  );
});
it("offers a clear route out of filtered empty results", () => {
  render(
    <CustomerPanel
      initial={{ ...initial, total: 0 }}
      search="Ana"
      active="all"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(mocks.push).toHaveBeenLastCalledWith("/clientes");
});
it("distinguishes an empty page from having no customers", () => {
  render(
    <CustomerPanel
      initial={{ ...initial, page: 2, total: 10 }}
      search=""
      active="all"
    />,
  );
  expect(screen.queryByText("Nenhum cliente cadastrado")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Voltar à primeira página" }),
  );
  expect(mocks.push).toHaveBeenLastCalledWith(
    "/clientes?search=&active=all&page=1",
  );
});
it("places actionable priorities before charts", () => {
  const { container } = render(
    <DashboardPanel
      data={
        {
          metrics: [],
          charts: [{ id: "test" }],
          priorities: [],
          tables: [],
          notes: [],
        } as unknown as Parameters<typeof DashboardPanel>[0]["data"]
      }
    />,
  );
  const headings = [
    ...container.querySelectorAll('[data-slot="card-title"], h2'),
  ].map((e) => e.textContent);
  expect(headings.indexOf("O que precisa de atenção")).toBeLessThan(
    headings.indexOf("Gráfico de teste"),
  );
});
it("opens invalid custom dates and keeps URL unchanged", () => {
  const filter = resolveDashboardFilter(
    {},
    "ADMIN",
    new Date("2026-11-04T15:00Z"),
  );
  render(
    <DashboardToolbar filter={filter} panels={permittedPanels("ADMIN")} />,
  );
  const trigger = screen.getByRole("button", { name: "Período e filtros" });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText("Início"), {
    target: { value: "2026-11-03" },
  });
  fireEvent.change(screen.getByLabelText("Fim"), {
    target: { value: "2026-11-01" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Aplicar período" }).closest("form")!,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(mocks.push).not.toHaveBeenCalled();
});
it("shows a live review beside save", () => {
  render(<CustomerForm onSaved={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome do cliente"), {
    target: { value: "Ana" },
  });
  expect(
    screen.getByRole("region", { name: "Conferir cliente" }).textContent,
  ).toContain("Ana");
  expect(screen.getByRole("heading", { name: "Identificação" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Contato" })).toBeTruthy();
});
it("protects browser exit only while the editor has unsaved changes", () => {
  const view = render(
    <ContextEditor open onOpenChange={vi.fn()} title="Cliente">
      <input aria-label="Nome" />
    </ContextEditor>,
  );
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  view.rerender(
    <ContextEditor open={false} onOpenChange={vi.fn()} title="Cliente">
      <input aria-label="Nome" />
    </ContextEditor>,
  );
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
});
it("preserves the draft on API failure and submits the existing concurrency contract", async () => {
  const customer = {
    id: "c1",
    version: 4,
    name: "Ana",
    type: "PERSON" as const,
    document: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    active: true,
  };
  const saved = vi.fn();
  mocks.api.mockRejectedValueOnce(new Error("Tente novamente"));
  render(
    <CustomerForm customer={customer} onSaved={saved} onCancel={vi.fn()} />,
  );
  fireEvent.change(screen.getByLabelText("Nome do cliente"), {
    target: { value: "Ana Silva" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Salvar cliente" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Tente novamente"),
  );
  expect(
    (screen.getByLabelText("Nome do cliente") as HTMLInputElement).value,
  ).toBe("Ana Silva");
  expect(saved).not.toHaveBeenCalled();
  expect(mocks.api).toHaveBeenCalledWith(
    "/api/customers/c1",
    expect.objectContaining({ name: "Ana Silva", expectedVersion: 4 }),
    "PUT",
  );
  mocks.api.mockResolvedValueOnce({
    ...customer,
    name: "Ana Silva",
    version: 5,
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Salvar cliente" }).closest("form")!,
  );
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ version: 5 })),
  );
});
