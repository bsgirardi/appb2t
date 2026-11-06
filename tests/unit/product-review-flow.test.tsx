// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProductPricingEditor } from "@/components/pricing/product-pricing-editor";
import { ProductForm } from "@/components/products/product-form";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { lotFixture } from "../fixtures/pricing";
import { calculatorData, productDTO } from "../fixtures/product";
import { calculateV2 } from "@/domain/pricing/calculate";
import type { CalculationInput } from "@/domain/calculation/types";
import { api } from "@/lib/client-api";
import { createEstimate } from "@/lib/pricing-client";
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
vi.mock("@/lib/pricing-client", () => ({ createEstimate: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("applies revised costs inside an existing product without changing its final price or name", async () => {
  vi.mocked(api).mockResolvedValue(pricingCatalog);
  const snapshot = {
    id: "old",
    version: 2 as const,
    input: lotFixture,
    result: calculateV2(lotFixture),
    actorId: "a",
    actorName: "Equipe",
    createdAt: "2026-11-01T00:00:00Z",
  };
  vi.mocked(createEstimate).mockResolvedValue({ ...snapshot, id: "new" });
  render(
    <ProductForm
      product={{
        ...productDTO,
        calculation: { version: 2, snapshotId: "old" },
        pricingSnapshot: snapshot,
      }}
      data={calculatorData}
      role="OPERATOR"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByText("Custos e referências de produção", { exact: true }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar ficha por lote" }),
  );
  fireEvent.click(
    await screen.findByRole("checkbox", {
      name: "Conferi as referências atuais da ficha",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar ficha revisada" }),
  );
  await screen.findByText(
    "Ficha por lote aplicada ao rascunho. O preço final foi preservado.",
  );
  expect(
    (screen.getByLabelText("Preço final de venda") as HTMLInputElement).value,
  ).toBe(productDTO.price);
  expect(
    (screen.getByLabelText("Nome do produto") as HTMLInputElement).value,
  ).toBe(productDTO.name);
  expect(createEstimate).toHaveBeenCalledTimes(1);
});
it("reviews changed references before drafting and applies to the same product with before/after costs", async () => {
  const catalog = structuredClone(pricingCatalog);
  catalog.materials[0].price = "150";
  catalog.materials[0].version = 2;
  vi.mocked(api).mockResolvedValue(catalog);
  const snapshot = {
    id: "old",
    version: 2 as const,
    input: lotFixture,
    result: calculateV2(lotFixture),
    actorId: "a",
    actorName: "Equipe",
    createdAt: "2026-11-01T00:00:00Z",
  };
  vi.mocked(createEstimate).mockResolvedValue({ ...snapshot, id: "new" });
  const onApply = vi.fn();
  render(
    <ProductPricingEditor
      snapshot={snapshot}
      legacy={productDTO.calculation as CalculationInput}
      onApply={onApply}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar ficha por lote" }),
  );
  await screen.findByText(/Conferir referências históricas e atuais/);
  expect(screen.queryByLabelText("Quantidade do lote")).toBeNull();
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Conferi as referências atuais da ficha",
    }),
  );
  expect(
    screen.getByRole("region", { name: "Conferir custo anterior e revisado" })
      .textContent,
  ).toContain("R$ 5,62 → R$ 6,17");
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar ficha revisada" }),
  );
  await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
  expect(createEstimate).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: "MARKUP",
      materials: expect.arrayContaining([
        expect.objectContaining({ ref: { id: "a", version: 2 } }),
      ]),
    }),
    expect.any(String),
  );
  expect(onApply.mock.calls[0][0].id).toBe("new");
  expect(snapshot.result.unitFullCost).toBe("5.62");
});
