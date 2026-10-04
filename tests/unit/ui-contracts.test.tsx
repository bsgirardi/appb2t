// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Field, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
afterEach(cleanup);
it("field_preserves_formdata_and_descriptions", () => {
  const { container } = render(
    <form>
      <p id="external">Externo</p>
      <Field
        label="Preço"
        name="price"
        defaultValue="12"
        hint="Em reais"
        suffix="R$"
        aria-describedby="external"
      />
    </form>,
  );
  const input = screen.getByLabelText("Preço");
  expect(new FormData(container.querySelector("form")!).get("price")).toBe(
    "12",
  );
  const descriptions = input.getAttribute("aria-describedby")!.split(" ");
  expect(descriptions).toContain("external");
  expect(
    descriptions.some(
      (id) => document.getElementById(id)?.textContent === "Em reais",
    ),
  ).toBe(true);
  expect(screen.getByText("R$")).toBeTruthy();
});
it("native_select_preserves_required_empty_value", () => {
  const { container } = render(
    <form>
      <NativeSelect name="choice" required defaultValue="">
        <option value="">Selecione</option>
        <option value="a">A</option>
      </NativeSelect>
    </form>,
  );
  expect(container.querySelector("select")!.checkValidity()).toBe(false);
  expect(new FormData(container.querySelector("form")!).get("choice")).toBe("");
});
it("checkbox_respects_fieldset_disabled_and_formdata", () => {
  const { container } = render(
    <form>
      <Checkbox name="active" defaultChecked />
      <Checkbox name="off" />
      <fieldset disabled>
        <Checkbox name="disabled" defaultChecked />
      </fieldset>
    </form>,
  );
  const data = new FormData(container.querySelector("form")!);
  expect(data.get("active")).toBe("on");
  expect(data.has("off")).toBe(false);
  expect(data.has("disabled")).toBe(false);
});
it("notice_keeps_live_roles", () => {
  render(
    <>
      <Notice>Erro</Notice>
      <Notice kind="info">Informação</Notice>
    </>,
  );
  expect(screen.getByRole("alert").textContent).toBe("Erro");
  expect(screen.getByRole("status").textContent).toBe("Informação");
});
