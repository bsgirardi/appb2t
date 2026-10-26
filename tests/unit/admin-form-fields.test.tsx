// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/admin/form-section";
import { revealAndFocusInvalid } from "@/components/admin/form-errors";
afterEach(cleanup);

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
