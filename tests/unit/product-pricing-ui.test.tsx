// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductForm } from "@/components/products/product-form";
import { productDTO, calculatorData } from "../fixtures/product";
import { lotFixture } from "../fixtures/pricing";
import type { PricingSnapshotDTO } from "@/domain/pricing/types";
afterEach(cleanup);
const snapshot: PricingSnapshotDTO = {
  id: "snapshot",
  version: 2,
  input: lotFixture,
  result: {
    material: "21",
    energy: "0.2",
    depreciation: "2",
    maintenance: "1",
    failure: "0",
    labor: "20",
    extras: "10",
    commercialFixed: "2",
    variableCost: "54.2",
    fullCost: "56.2",
    unitFullCost: "5.62",
    theoreticalRevenue: "124.888888",
    offeredUnitPrice: "12.49",
    offeredRevenue: "124.9",
    fees: "12.49",
    contribution: "58.21",
    afterDepreciation: "56.21",
    contributionMargin: "46.605",
    warnings: [],
  },
  actorId: "a",
  actorName: "Equipe",
  createdAt: "2026-10-05T00:00:00Z",
};
it("does not replace negotiated price when opening a V2 product", () => {
  render(
    <ProductForm
      product={{
        ...productDTO,
        calculation: { version: 2, snapshotId: "snapshot" },
        pricingSnapshot: snapshot,
      }}
      data={calculatorData}
      role="ADMIN"
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(
    (screen.getByLabelText("Preço final de venda") as HTMLInputElement).value,
  ).toBe("48.19");
  fireEvent.click(screen.getByRole("button", { name: "Usar preço sugerido" }));
  expect(
    (screen.getByLabelText("Preço final de venda") as HTMLInputElement).value,
  ).toBe("12.49");
});
