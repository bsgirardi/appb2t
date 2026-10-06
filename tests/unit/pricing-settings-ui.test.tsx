// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PricingSettingsPanel } from "@/components/pricing/pricing-settings-panel";
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
  await screen.findByRole("alert");
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("2");
});
