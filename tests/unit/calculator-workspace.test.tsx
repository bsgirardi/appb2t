// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { calculatorData } from "../fixtures/product";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);
it("keeps original and V2 available and preserves a V3 draft when changing tabs", () => {
  render(
    <CalculatorWorkspace
      data={calculatorData}
      catalog={pricingCatalog}
      role="ADMIN"
    />,
  );
  expect(
    screen
      .getByRole("tab", { name: "Cálculo original" })
      .getAttribute("aria-selected"),
  ).toBe("true");
  const selectTab = (name: string) =>
    fireEvent.mouseDown(screen.getByRole("tab", { name }), {
      button: 0,
      ctrlKey: false,
    });
  selectTab("Calculadora V3");
  fireEvent.change(screen.getByLabelText("Quantidade do lote"), {
    target: { value: "7" },
  });
  selectTab("Cálculo por lote · V2");
  const v2 = screen.getByRole("tabpanel", { name: "Cálculo por lote · V2" });
  expect(within(v2).getByLabelText("Quantidade do lote")).toBeTruthy();
  selectTab("Calculadora V3");
  const v3 = screen.getByRole("tabpanel", { name: "Calculadora V3" });
  expect(
    (within(v3).getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("7");
});
