// @vitest-environment jsdom
import { it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { ProductConfigurationEditor } from "@/components/products/product-configuration-editor";
import { emptyProductConfiguration } from "@/domain/products/configuration";
afterEach(cleanup);
it("adds and renames a field while preserving its identity", () => {
  function Form() {
    const [value, setValue] = useState(emptyProductConfiguration);
    return (
      <>
        <ProductConfigurationEditor
          value={value}
          images={[]}
          onChange={setValue}
        />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }
  const { container } = render(<Form />);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar campo" }));
  const before = JSON.parse(container.querySelector("output")!.textContent!);
  fireEvent.change(screen.getByLabelText("Nome do campo 1"), {
    target: { value: "Nome da criança" },
  });
  const after = JSON.parse(container.querySelector("output")!.textContent!);
  expect(after.fields[0].id).toBe(before.fields[0].id);
  expect(after.fields[0].label).toBe("Nome da criança");
  fireEvent.click(screen.getByRole("button", { name: "Remover campo 1" }));
  expect(
    screen.getByRole("button", { name: "Confirmar remoção" }),
  ).toBeTruthy();
});
