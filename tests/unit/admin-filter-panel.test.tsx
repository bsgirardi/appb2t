// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterPanel } from "@/components/admin/filter-panel";
import { Field } from "@/components/ui/field";
import { FinanceFilters } from "@/components/finance/filters";
afterEach(cleanup);
it("starts collapsed, advertises active filters and preserves drafts across toggles", () => {
  render(
    <FilterPanel activeCount={1}>
      <form>
        <Field label="Buscar" name="search" defaultValue="vaso" />
      </form>
    </FilterPanel>,
  );
  const trigger = screen.getByRole("button", { name: /Filtros/ });
  expect(trigger.closest('[data-slot="collapsible"]')).toBeTruthy();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByText("1 ativos")).toBeTruthy();
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText("Buscar"), {
    target: { value: "caneca" },
  });
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe(
    "caneca",
  );
});
it("opens when errors arrive", () => {
  const view = render(
    <FilterPanel>
      <Field label="Preço" />
    </FilterPanel>,
  );
  view.rerender(
    <FilterPanel hasErrors>
      <Field label="Preço" />
    </FilterPanel>,
  );
  expect(
    screen
      .getByRole("button", { name: "Filtros" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});
it("keeps the finance query and GET behavior when expanded", () => {
  const { container } = render(
    <FinanceFilters
      action="/financeiro"
      query={{ search: "vaso", saleId: "s1" }}
      accounts={[]}
      categories={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  const form = container.querySelector("form")!;
  expect(form.getAttribute("action")).toBe("/financeiro");
  expect(new FormData(form).get("saleId")).toBe("s1");
  expect(new FormData(form).get("search")).toBe("vaso");
});
