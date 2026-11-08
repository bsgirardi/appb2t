// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChartStyle } from "@/components/ui/chart";
import {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
} from "@/components/ui/combobox";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

it("chart config.theme follows the application's explicit dark preference", () => {
  document.documentElement.dataset.theme = "dark";
  render(
    <>
      <ChartStyle
        id="sample"
        config={{ value: { theme: { light: "#0066cc", dark: "#ff7a00" } } }}
      />
      <div data-chart="sample" />
    </>,
  );
  expect(
    getComputedStyle(document.querySelector('[data-chart="sample"]')!)
      .getPropertyValue("--color-value")
      .trim(),
  ).toBe("#ff7a00");
});

it("combobox icon actions have accessible names", () => {
  render(
    <Combobox items={["A"]} defaultValue="A">
      <ComboboxInput aria-label="Produto" showClear />
    </Combobox>,
  );
  expect(screen.getByRole("button", { name: "Mostrar opções" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Limpar seleção" })).toBeTruthy();
});

it("combobox preserves an explicit consumer trigger name", () => {
  render(
    <Combobox>
      <ComboboxTrigger aria-label="Choisir un produit" />
    </Combobox>,
  );
  expect(
    screen.getByRole("combobox", { name: "Choisir un produit" }),
  ).toBeTruthy();
});

it("combobox keeps the visible name of a text trigger", () => {
  render(
    <Combobox>
      <ComboboxInput aria-label="Produto" showTrigger={false} />
      <ComboboxTrigger>Selecionar produto</ComboboxTrigger>
    </Combobox>,
  );
  expect(
    screen.getByRole("button", { name: "Selecionar produto" }),
  ).toBeTruthy();
});

it("explicit light remains light and automatic dark is limited to roots without a preference", () => {
  document.documentElement.dataset.theme = "light";
  const view = render(
    <>
      <ChartStyle
        id="sample"
        config={{
          value: { theme: { light: "#0066cc", dark: "#ff7a00" } },
          constant: { color: "#663399" },
        }}
      />
      <div data-chart="sample" />
    </>,
  );
  const styles = getComputedStyle(
    document.querySelector('[data-chart="sample"]')!,
  );
  expect(styles.getPropertyValue("--color-value").trim()).toBe("#0066cc");
  expect(styles.getPropertyValue("--color-constant").trim()).toBe("#663399");
  expect(view.container.querySelector("style")!.textContent).toContain(
    "@media (prefers-color-scheme: dark)",
  );
  expect(view.container.querySelector("style")!.textContent).toContain(
    ":root:not([data-theme]) [data-chart=sample]",
  );
});
