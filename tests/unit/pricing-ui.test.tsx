// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BatchPricingForm } from "@/components/pricing/batch-pricing-form";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { lotFixture } from "../fixtures/pricing";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("modeDoesNotCarryMarkupIntoMargin", () => {
  render(
    <BatchPricingForm
      catalog={{
        ...pricingCatalog,
        settings: { ...pricingCatalog.settings!, markupPercent: "200" },
      }}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Modalidade de preço"), {
    target: { value: "CONTRIBUTION" },
  });
  expect(screen.getByLabelText("Margem alvo (%)").getAttribute("value")).toBe(
    "30",
  );
  expect(
    screen.getByText("Preço sugerido por peça").nextElementSibling?.textContent,
  ).toBe("R$ 9,03");
});
it("invalidInputHidesOldPrice", () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  expect(
    screen.getByText("Preço sugerido por peça").nextElementSibling?.textContent,
  ).toBe("R$ 12,49");
  fireEvent.change(screen.getByLabelText("Consumo por peça 1 (g)"), {
    target: { value: "" },
  });
  expect(screen.queryByText("R$ 12,49")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Aplicar estimativa",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("zeroPriceCanBeSimulated and operatorCannotEditRates", () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .readOnly,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Modalidade de preço"), {
    target: { value: "INFORMED" },
  });
  fireEvent.change(screen.getByLabelText("Preço unitário informado (R$)"), {
    target: { value: "0" },
  });
  expect(screen.getByText("Não aplicável")).toBeTruthy();
});
it("networkFailureKeepsDraft", async () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {
        throw new Error("Sem conexão");
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Aplicar estimativa" }));
  await screen.findByText("Sem conexão");
  expect(
    screen.getByText("Preço sugerido por peça").nextElementSibling?.textContent,
  ).toBe("R$ 12,49");
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("10");
});
it("refreshShowsDiffBeforeReplacing", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          ...pricingCatalog,
          settings: { ...pricingCatalog.settings, version: 2, energyRate: "2" },
        },
      }),
      { status: 200 },
    ),
  );
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar parâmetros atuais" }),
  );
  await screen.findByRole("button", { name: "Aplicar parâmetros revisados" });
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("1");
  fireEvent.click(
    screen.getByRole("button", { name: "Manter parâmetros anteriores" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Aplicar parâmetros revisados" }),
    ).toBeNull(),
  );
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("1");
});
it("refreshPreviewsMachineChannelAndExtraBeforeAccepting", async () => {
  const next = {
    ...pricingCatalog,
    printers: [{ ...pricingCatalog.printers[0], watts: "250" }],
    extras: [{ ...pricingCatalog.extras[0], unitCost: "3" }],
    channels: [{ ...pricingCatalog.channels[0], fixedCost: "5" }],
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: next }), { status: 200 }),
  );
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar parâmetros atuais" }),
  );
  await screen.findByText(/Potência: 100 → 250 W/);
  expect(screen.getByText(/Embalagem: 1 → 3/)).toBeTruthy();
  expect(screen.getByText(/Custo fixo: 2 → 5/)).toBeTruthy();
});
it("scenarioDoesNotPublishPrice", () => {
  const apply = vi.fn();
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={apply}
    />,
  );
  fireEvent.change(screen.getByLabelText("Quantidades para comparar"), {
    target: { value: "20" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Usar 20 peças", hidden: true }),
  );
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe("20");
  expect(apply).not.toHaveBeenCalled();
});
