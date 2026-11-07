// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/admin/form-section";
import { AdminForm } from "@/components/admin/admin-form";
import { revealAndFocusInvalid } from "@/components/admin/form-errors";
afterEach(cleanup);

it("allows a contextual form guide without leaking the option to HTML", () => {
  const view = render(
    <AdminForm requiredGuide={false}>
      <Field label="Nome" required />
    </AdminForm>,
  );
  expect(view.container.querySelector(".admin-required-guide")).toBeNull();
  expect(
    view.container.querySelector("form")?.hasAttribute("requiredGuide"),
  ).toBe(false);
  view.rerender(
    <AdminForm>
      <Field label="Nome" required />
    </AdminForm>,
  );
  expect(screen.getByText(/Campos com/)).toBeTruthy();
});

it("identifies required fields without changing the accessible label", () => {
  render(
    <>
      <Field label="Nome" required />
      <Field label="Observação" />
    </>,
  );
  expect(screen.getAllByText("Obrigatório")).toHaveLength(1);
  expect(screen.getByLabelText("Nome").hasAttribute("required")).toBe(true);
  expect(screen.getByLabelText("Observação").hasAttribute("required")).toBe(
    false,
  );
});
it("associates errors and hints with the invalid control", () => {
  render(<Field label="Preço" hint="Valor em reais" error="Informe o preço" />);
  const input = screen.getByLabelText("Preço");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  const ids = input.getAttribute("aria-describedby")!.split(" ");
  expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
    "Valor em reais",
    "Informe o preço",
  ]);
});
it("reveals and focuses errors in collapsed sections without losing draft values", () => {
  const view = render(
    <form>
      <Field label="Nome" defaultValue="Ana" />
      <FormSection
        id="extra"
        title="Dados adicionais"
        collapsible
        defaultOpen={false}
      >
        <Field label="Referência" aria-invalid="true" defaultValue="ref" />
      </FormSection>
    </form>,
  );
  const form = view.container.querySelector("form")!;
  revealAndFocusInvalid(form);
  expect(view.container.querySelector("details")?.open).toBe(true);
  expect(document.activeElement).toBe(screen.getByLabelText("Referência"));
  expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Ana");
});
it("keeps a section with pending requirements expanded", () => {
  render(
    <FormSection
      id="pending"
      title="Venda"
      collapsible
      defaultOpen={false}
      hasErrors
    >
      <Field label="Prazo" required />
    </FormSection>,
  );
  expect(screen.getByText("Venda").closest("details")?.open).toBe(true);
  fireEvent.click(screen.getByText("Venda"));
});

it("reveals native invalid fields without dispatching validation recursively", () => {
  const view = render(
    <AdminForm>
      <FormSection
        id="native-required"
        title="Dados nativos"
        collapsible
        defaultOpen={false}
      >
        <Field label="Nome obrigatório" required />
      </FormSection>
    </AdminForm>,
  );
  const input = screen.getByLabelText("Nome obrigatório");
  let invalidEvents = 0;
  // Bound the regression on the old implementation instead of overflowing the runner.
  const observe = (event: Event) => {
    invalidEvents++;
    if (invalidEvents > 1) event.stopPropagation();
  };
  window.addEventListener("invalid", observe, true);
  try {
    fireEvent.invalid(input);
    expect(invalidEvents).toBe(1);
    expect(view.container.querySelector("details")?.open).toBe(true);
    expect(document.activeElement).toBe(input);
  } finally {
    window.removeEventListener("invalid", observe, true);
  }
});

it("skips controls barred from native validation when choosing the first error", () => {
  const view = render(
    <form>
      <Field label="Campo desabilitado" disabled />
      <Field label="Campo somente leitura" readOnly />
      <Field label="Campo pendente" required />
    </form>,
  );
  (
    screen.getByLabelText("Campo desabilitado") as HTMLInputElement
  ).setCustomValidity("Erro antigo");
  (
    screen.getByLabelText("Campo somente leitura") as HTMLInputElement
  ).setCustomValidity("Erro antigo");
  revealAndFocusInvalid(view.container.querySelector("form")!);
  expect(document.activeElement).toBe(screen.getByLabelText("Campo pendente"));
});
