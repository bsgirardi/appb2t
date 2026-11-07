// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { calculatorData } from "../fixtures/product";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);
it("opens one principal calculator and preserves its draft while consulting the original", () => {
  render(
    <CalculatorWorkspace
      data={calculatorData}
      role="OPERATOR"
      catalog={pricingCatalog}
    />,
  );
  expect(screen.queryByRole("tablist", { name: "Tipo de cálculo" })).toBeNull();
  expect(
    screen.getByRole("heading", { name: /Calculadora de impressão/ }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Quantidade do lote"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  expect(screen.getByText(/manutenção percentual/i)).toBeTruthy();
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("12");
});

it("protects a historical simulation before leaving the calculator", async () => {
  render(
    <CalculatorWorkspace
      data={calculatorData}
      role="ADMIN"
      catalog={pricingCatalog}
    />,
  );
  fireEvent.click(screen.getByText("Consultar cálculo original"));
  fireEvent.change(await screen.findByLabelText("Consumo de material"), {
    target: { value: "45" },
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

it("protects edits made only in the comparison editor", () => {
  render(
    <CalculatorWorkspace
      data={calculatorData}
      role="ADMIN"
      catalog={pricingCatalog}
    />,
  );
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Nome da comparação"), {
    target: { value: "Canal com desconto" },
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
