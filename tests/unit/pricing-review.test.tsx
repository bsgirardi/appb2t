// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PricingResult } from "@/components/pricing/pricing-result";
import { ProductPricingEditor } from "@/components/pricing/product-pricing-editor";
import { BatchPricingForm } from "@/components/pricing/batch-pricing-form";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture } from "../fixtures/pricing";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { productInput } from "../fixtures/product";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("historicalMemoryShowsOriginalMachineLaborExtrasAndChannelAssumptions", () => {
  const frozen = {
    ...lotFixture,
    energyRate: "0.123456",
    channel: {
      ...lotFixture.channel,
      fees: [{ label: "Taxa histórica", percent: "10" }],
    },
  };
  render(<PricingResult input={frozen} result={calculateV2(frozen)} />);
  expect(
    screen.getByText("Tarifa de energia preservada").nextElementSibling
      ?.textContent,
  ).toBe("R$ 0,123456/kWh");
  expect(
    screen.getByText("Tempo fixo de máquina").nextElementSibling?.textContent,
  ).toBe("120 min/lote");
  expect(
    screen.getByText("Capacidade de uso").nextElementSibling?.textContent,
  ).toBe("25 dias/mês × 8 h/dia");
  expect(screen.getByText("Preparação").nextElementSibling?.textContent).toBe(
    "30 min/lote",
  );
  expect(screen.getByText("Acabamento").nextElementSibling?.textContent).toBe(
    "3 min/peça",
  );
  expect(screen.getByText(/Taxa histórica: 10%/)).toBeTruthy();
  expect(screen.getByText(/1 por peça × R\$ 1/)).toBeTruthy();
  expect(
    screen.getByText("Modalidade preservada").nextElementSibling?.textContent,
  ).toBe("Markup sobre custo completo");
});
it.each(["material", "printer", "both", "unset"] as const)(
  "legacy resin conversion preserves physical inputs with unavailable %s reference",
  async (missing) => {
    const c = {
      ...pricingCatalog,
      materials:
        missing === "material" || missing === "both"
          ? []
          : pricingCatalog.materials,
      printers:
        missing === "printer" || missing === "both"
          ? []
          : pricingCatalog.printers,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: c }), { status: 200 }),
    );
    render(
      <ProductPricingEditor
        legacy={{
          ...productInput.calculation,
          technology: "RESIN",
          consumption: "37.5",
          hours: 2,
          minutes: 15,
        }}
        materialId={missing === "unset" ? null : "m1"}
        printerId={missing === "unset" ? null : "p"}
        onApply={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Preparar ficha por lote" }),
    );
    const consumption = await screen.findByLabelText("Consumo por peça 1 (ml)");
    expect((consumption as HTMLInputElement).value).toBe("37.5");
    expect(
      (
        screen.getByLabelText(
          "Tempo fixo de máquina (min/lote)",
        ) as HTMLInputElement
      ).value,
    ).toBe("135");
    expect(
      (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
    ).toBe("1");
    expect(
      (
        screen.getByRole("button", {
          name: "Aplicar estimativa",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  },
);
it("invalidPricePointsToItsFieldWithAnActionableMessage", () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Modalidade de preço"), {
    target: { value: "INFORMED" },
  });
  const price = screen.getByLabelText("Preço unitário informado (R$)");
  fireEvent.change(price, { target: { value: "8.001" } });
  expect(price.getAttribute("aria-invalid")).toBe("true");
  const described = price.getAttribute("aria-describedby");
  expect(described).toBeTruthy();
  expect(document.getElementById(described!)?.textContent).toContain(
    "até duas casas decimais",
  );
});
it("materialLimitIdentifiesTheOffendingLine", () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={vi.fn()}
    />,
  );
  const consumption = screen.getByLabelText("Consumo por peça 2 (g)");
  fireEvent.change(consumption, { target: { value: "100001" } });
  expect(consumption.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(consumption.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toContain("1.000.000");
  expect(
    screen
      .getByLabelText("Consumo por peça 1 (g)")
      .getAttribute("aria-invalid"),
  ).not.toBe("true");
});
it("overflowShowsTheActualCalculationLimit", () => {
  const huge = {
    ...pricingCatalog,
    settings: {
      ...pricingCatalog.settings!,
      markupPercent: "999999999999.999999",
      laborPerHour: "999999999999.999999",
    },
  };
  render(
    <BatchPricingForm
      catalog={huge}
      initialInput={lotFixture}
      onApply={vi.fn()}
    />,
  );
  expect(screen.getByText(/resultado excede o limite monetário/)).toBeTruthy();
});
it("marginAndFeesErrorIsAssociatedWithTheSelectedMargin", () => {
  const c = {
    ...pricingCatalog,
    channels: [
      {
        ...pricingCatalog.channels[0],
        fees: [{ label: "Taxa", percent: "70" }],
      },
    ],
  };
  render(
    <BatchPricingForm
      catalog={c}
      initialInput={lotFixture}
      onApply={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Modalidade de preço"), {
    target: { value: "CONTRIBUTION" },
  });
  const margin = screen.getByLabelText("Margem alvo (%)");
  expect(margin.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(margin.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toContain("Margem e taxas");
});
