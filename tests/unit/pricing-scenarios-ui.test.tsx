// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { PricingScenarios } from "@/components/pricing/pricing-scenarios";
import { lotFixture as f } from "../fixtures/pricing";

afterEach(cleanup);
function compare(text = "10") {
  fireEvent.click(screen.getByText("Comparar quantidades"));
  fireEvent.change(screen.getByLabelText("Quantidades para comparar"), {
    target: { value: text },
  });
}
function value(row: HTMLElement, label: string) {
  return within(row).getByText(label).nextElementSibling?.textContent;
}
it("compares financial results and production resources with explicit labels", () => {
  const onSelect = vi.fn();
  render(<PricingScenarios input={f} onSelect={onSelect} />);
  compare();
  const row = screen.getByRole("article", { name: "10 peças" });
  expect(value(row, "Custo completo por peça")).toBe("R$ 5,62");
  expect(value(row, "Preço oferecido por peça")).toBe("R$ 12,49");
  expect(value(row, "Receita do lote")).toBe("R$ 124,90");
  expect(value(row, "Contribuição estimada")).toBe("R$ 58,21");
  expect(value(row, "Resultado após depreciação")).toBe("R$ 56,21");
  expect(value(row, "Contribuição por hora de máquina")).toBe("R$ 29,11/h");
  expect(value(row, "Tempo de máquina")).toBe("120 min");
  expect(value(row, "Margem de contribuição")).toMatch(/46,61%/);
  expect(within(row).getByText("A: 110 g")).toBeTruthy();
  expect(within(row).getByText("B: 50 g")).toBeTruthy();
  expect(screen.getByText(/Canal: Direto/)).toBeTruthy();
  expect(screen.getByText(/Modalidade: Markup/)).toBeTruthy();
  expect(screen.getByText(/não garante atingir a meta comercial/)).toBeTruthy();
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(within(row).getByRole("button", { name: "Usar 10 peças" }));
  expect(onSelect.mock.calls).toEqual([[10]]);
});
it("shows configured target and effective margin after unit rounding", () => {
  render(
    <PricingScenarios
      input={{ ...f, mode: "CONTRIBUTION" }}
      onSelect={() => {}}
    />,
  );
  compare();
  expect(screen.getByText(/Meta de margem de contribuição: 30%/)).toBeTruthy();
  const row = screen.getByRole("article", { name: "10 peças" });
  expect(value(row, "Margem de contribuição")).toBe("29,98%");
  expect(
    within(row).getByText(/arredondamento do preço por peça/),
  ).toBeTruthy();
});
it("keeps zero price, negative results and non applicable margin visible", () => {
  render(
    <PricingScenarios
      input={{ ...f, mode: "INFORMED", informedUnitPrice: "0" }}
      onSelect={() => {}}
    />,
  );
  compare();
  const row = screen.getByRole("article", { name: "10 peças" });
  expect(value(row, "Margem de contribuição")).toBe("Não aplicável");
  expect(value(row, "Contribuição por hora de máquina")).toBe("R$ -27,10/h");
  expect(value(row, "Resultado após depreciação")).toBe("R$ -56,20");
  expect(
    within(row).getByText(/não cobre o custo completo modelado/),
  ).toBeTruthy();
  expect(screen.queryByText(/Meta de margem/)).toBeNull();
});
it("distinguishes positive contribution from full cost coverage", () => {
  render(
    <PricingScenarios
      input={{ ...f, mode: "INFORMED", informedUnitPrice: "6.10" }}
      onSelect={() => {}}
    />,
  );
  compare();
  const row = screen.getByRole("article", { name: "10 peças" });
  expect(value(row, "Contribuição estimada")).toBe("R$ 0,70");
  expect(value(row, "Resultado após depreciação")).toBe("R$ -1,30");
  expect(
    within(row).getByText(/não cobre o custo completo modelado/),
  ).toBeTruthy();
});
it("removes stale rows for invalid quantities and updated invalid parameters", () => {
  const { rerender } = render(
    <PricingScenarios input={f} onSelect={() => {}} />,
  );
  compare("10; 20");
  expect(screen.getAllByRole("article")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Quantidades para comparar"), {
    target: { value: "0" },
  });
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Quantidades para comparar"), {
    target: { value: "10" },
  });
  rerender(
    <PricingScenarios
      input={{ ...f, machineMinutesPerUnit: "6000000" }}
      onSelect={() => {}}
    />,
  );
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.getByRole("alert")).toBeTruthy();
});
it("shows resin resources in ml and recalculates on input changes", () => {
  const input = {
    ...f,
    technology: "RESIN" as const,
    materials: f.materials.map((m) => ({ ...m, unit: "ML" as const })),
  };
  const { rerender } = render(
    <PricingScenarios input={input} onSelect={() => {}} />,
  );
  compare();
  expect(screen.getByText("A: 110 ml")).toBeTruthy();
  rerender(
    <PricingScenarios
      input={{ ...input, machineMinutesPerUnit: "6" }}
      onSelect={() => {}}
    />,
  );
  expect(value(screen.getByRole("article"), "Tempo de máquina")).toBe(
    "180 min",
  );
});
