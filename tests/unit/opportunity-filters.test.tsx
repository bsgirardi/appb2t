// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OpportunityPanel } from "@/components/opportunities/panel";
import { opportunity, opportunityOptions } from "../fixtures/opportunity";
import { opportunityFilterSchema } from "@/domain/opportunities/validation";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("restores visible filters when navigating back to earlier results", () => {
  const a = opportunityFilterSchema.parse({
    search: "Lote",
    owner: "todos",
    stage: "abertas",
    due: "todas",
  });
  const b = opportunityFilterSchema.parse({
    search: "Especial",
    owner: "eu",
    stage: "NEGOCIACAO",
    due: "hoje",
  });
  const props = {
    initial: { items: [opportunity], total: 1, page: 1, pageSize: 20 },
    options: opportunityOptions,
    actorId: "u",
  };
  const { rerender } = render(<OpportunityPanel {...props} filters={a} />);
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText("Buscar negociação"), {
    target: { value: "Especial" },
  });
  fireEvent.change(screen.getByLabelText("Responsável"), {
    target: { value: "eu" },
  });
  fireEvent.change(screen.getByLabelText("Etapa"), {
    target: { value: "NEGOCIACAO" },
  });
  fireEvent.change(screen.getByLabelText("Próxima ação"), {
    target: { value: "hoje" },
  });
  rerender(<OpportunityPanel {...props} filters={b} />);
  rerender(<OpportunityPanel {...props} filters={a} />);
  expect(
    (screen.getByLabelText("Buscar negociação") as HTMLInputElement).value,
  ).toBe("Lote");
  expect(
    (screen.getByLabelText("Responsável") as HTMLSelectElement).value,
  ).toBe("todos");
  expect((screen.getByLabelText("Etapa") as HTMLSelectElement).value).toBe(
    "abertas",
  );
  expect(
    (screen.getByLabelText("Próxima ação") as HTMLSelectElement).value,
  ).toBe("todas");
  fireEvent.click(screen.getByRole("button", { name: "Filtrar negociações" }));
  const url = new URL(push.mock.calls[0][0], "http://localhost");
  expect(url.searchParams.get("search")).toBe("Lote");
  expect(url.searchParams.get("owner")).toBe("todos");
});
