// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  PricingSettingsPanel,
  PricingSettingsProvider,
  PricingRatesPanel,
} from "@/components/pricing/pricing-settings-panel";
import { pricingSettingsWriteSchema } from "@/domain/pricing/catalog";
import { pricingCatalog } from "../fixtures/pricing-catalog";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("does not invent rates when new settings are unconfigured", () => {
  render(
    <PricingSettingsPanel
      initialCatalog={{ ...pricingCatalog, settings: null }}
    />,
  );
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("");
});
it("retains admin draft when saving fails", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));
  render(<PricingSettingsPanel initialCatalog={pricingCatalog} />);
  fireEvent.change(screen.getByLabelText("Tarifa de energia (R$/kWh)"), {
    target: { value: "2" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar parâmetros do lote" }),
  );
  await screen.findAllByRole("alert");
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("2");
});
it.each(["HOURLY", "FIXED_PER_LOT"] as const)(
  "saves the first production setup without hidden pricing fields (%s)",
  async (mode) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      const parsed = pricingSettingsWriteSchema.safeParse(
        JSON.parse(options!.body as string),
      );
      if (!parsed.success)
        return new Response(
          JSON.stringify({
            error: {
              message: "Verifique os campos informados.",
              code: "VALIDATION",
            },
          }),
          { status: 422 },
        );
      return new Response(
        JSON.stringify({ data: { ...parsed.data, version: 1 } }),
      );
    });
    render(
      <PricingSettingsProvider
        initialCatalog={{ ...pricingCatalog, settings: null }}
      >
        <PricingRatesPanel section="production" />
      </PricingSettingsProvider>,
    );
    fireEvent.change(screen.getByLabelText("Cobrança da manutenção"), {
      target: { value: mode },
    });
    for (const [label, value] of [
      ["Tarifa de energia (R$/kWh)", "1"],
      [
        mode === "FIXED_PER_LOT"
          ? "Manutenção fixa (R$/lote)"
          : "Manutenção (R$/hora)",
        "2",
      ],
      ["Reserva para falhas (%)", "10"],
      ["Trabalho (R$/hora)", "1"],
    ]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar custos de produção" }),
    );
    expect(
      await screen.findByText(
        "Parâmetros salvos. Estimativas anteriores permanecem iguais.",
      ),
    ).toBeTruthy();
  },
);
it("identifies invalid fields and preserves their values", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          message: "Verifique os campos informados.",
          code: "VALIDATION",
          fields: { energyRate: "Informe um número não negativo." },
        },
      }),
      { status: 422 },
    ),
  );
  render(<PricingSettingsPanel initialCatalog={pricingCatalog} />);
  fireEvent.change(screen.getByLabelText("Tarifa de energia (R$/kWh)"), {
    target: { value: "-1" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar parâmetros do lote" }),
  );
  await screen.findAllByRole("alert");
  expect(
    screen
      .getByLabelText("Tarifa de energia (R$/kWh)")
      .getAttribute("aria-invalid"),
  ).toBe("true");
});
it("lets an administrator choose a fixed maintenance cost per batch", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(
    async (_url, options) =>
      new Response(
        JSON.stringify({
          data: { ...JSON.parse(options!.body as string), version: 2 },
        }),
      ),
  );
  render(<PricingSettingsPanel initialCatalog={pricingCatalog} />);
  fireEvent.change(screen.getByLabelText("Cobrança da manutenção"), {
    target: { value: "FIXED_PER_LOT" },
  });
  fireEvent.change(screen.getByLabelText("Manutenção fixa (R$/lote)"), {
    target: { value: "15,50" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar parâmetros do lote" }),
  );
  await screen.findByText(
    "Parâmetros salvos. Estimativas anteriores permanecem iguais.",
  );
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({
    maintenanceMode: "FIXED_PER_LOT",
    maintenanceFixedPerLot: "15,50",
  });
});
