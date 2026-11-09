// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { calculatorData } from "../fixtures/product";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);
it("offers a single calculator and preserves its current draft", async () => {
  render(
    <CalculatorWorkspace
      data={calculatorData}
      catalog={pricingCatalog}
      role="ADMIN"
    />,
  );
  fireEvent.change(screen.getByLabelText("Quantidade do lote"), {
    target: { value: "7" },
  });
  expect(screen.queryByText("Consultar cálculo original")).toBeNull();
  expect(screen.queryByLabelText("Consumo de material")).toBeNull();
  expect(screen.queryByRole("tab", { name: /V2|V3|original/i })).toBeNull();
  expect(
    screen.getByRole("link", {
      name: "Biblioteca de cenários e comparações salvas",
    }),
  ).toBeTruthy();
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("7");
});
