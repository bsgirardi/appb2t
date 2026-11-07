// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { calculatorData } from "../fixtures/product";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);
it("preserves the primary draft when consulting the historical calculator", async () => {
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
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  const original = await screen.findByLabelText("Consumo de material");
  fireEvent.change(original, { target: { value: "50" } });
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  expect(
    (screen.getByLabelText("Consumo de material") as HTMLInputElement).value,
  ).toBe("50");
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("7");
});
