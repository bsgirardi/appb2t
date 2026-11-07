// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { GuidedPricingForm } from "@/components/pricing/guided-pricing-form";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { lotFixture } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";
import { requestFromInput } from "@/domain/pricing/resolve";
import { formatBRL } from "@/domain/calculation/calculate";
import type { PricingV2Input } from "@/domain/pricing/types";
afterEach(cleanup);
for (const technology of ["FDM", "RESIN"] as const) {
  it.each(["MARKUP", "CONTRIBUTION", "INFORMED"] as const)(
    `${technology} preserves fractional multi-material, labor, extras and %s results`,
    async (mode) => {
      const catalog = structuredClone(pricingCatalog);
      catalog.materials.forEach((row) => {
        row.technology = technology;
      });
      catalog.printers.forEach((row) => {
        row.technology = technology;
      });
      const input: PricingV2Input = {
        ...structuredClone(lotFixture),
        technology,
        mode,
        materials: lotFixture.materials.map((row) => ({
          ...row,
          unit: technology === "FDM" ? "G" : "ML",
          consumptionPerUnit: "0.123456",
        })),
        machineFixedMinutes: "135.123456",
        machineMinutesPerUnit: "0.123456",
        informedUnitPrice: mode === "INFORMED" ? "0" : "8",
        extras: [
          ...lotFixture.extras,
          { ...lotFixture.extras[0], basis: "LOT", quantity: "0.123456" },
        ],
      };
      const expected = calculateV2(input);
      const apply = vi.fn(async () => {});
      render(
        <GuidedPricingForm
          catalog={catalog}
          initialInput={input}
          fixedQuantity={10}
          onApply={apply}
        />,
      );
      const result = within(
        screen.getByRole("region", { name: "Resultado do lote" }),
      );
      expect(
        result.getByText("Custo completo por peça").nextElementSibling
          ?.textContent,
      ).toBe(formatBRL(expected.unitFullCost));
      expect(
        result.getByText("Contribuição estimada").nextElementSibling
          ?.textContent,
      ).toBe(formatBRL(expected.contribution));
      expect(screen.queryByText("Comparar quantidades")).toBeNull();
      expect(
        (screen.getByLabelText("Quantidade do lote") as HTMLInputElement)
          .readOnly,
      ).toBe(true);
      fireEvent.click(
        screen.getByRole("button", { name: "Aplicar estimativa" }),
      );
      await waitFor(() =>
        expect(apply).toHaveBeenCalledWith(
          requestFromInput(input, catalog.settings!.version),
        ),
      );
    },
  );
}
