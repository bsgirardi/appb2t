// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { GuidedPricingForm } from "@/components/pricing/guided-pricing-form";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { lotFixture } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";
import { formatBRL } from "@/domain/calculation/calculate";
import { requestFromInput } from "@/domain/pricing/resolve";
import type { PricingRequest } from "@/domain/pricing/types";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("offers the same V2 result and applies the unchanged request", async () => {
  const onApply = vi
    .fn<(request: PricingRequest) => Promise<void>>()
    .mockResolvedValue(undefined);
  render(
    <GuidedPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={onApply}
    />,
  );
  expect(
    screen.getByText("Preço sugerido por peça").nextElementSibling?.textContent,
  ).toBe("R$ 12,49");
  fireEvent.click(screen.getByRole("button", { name: "Aplicar estimativa" }));
  await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
  const request = onApply.mock.calls[0][0];
  expect(request).toEqual(
    requestFromInput(lotFixture, pricingCatalog.settings!.version),
  );
  expect(request).toMatchObject({
    quantity: lotFixture.quantity,
    machineFixedMinutes: lotFixture.machineFixedMinutes,
  });
});
it("converts hours and minutes and removes stale results on invalid duration", () => {
  render(
    <GuidedPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Horas de impressão do lote"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Minutos de impressão do lote"), {
    target: { value: "30" },
  });
  expect(
    screen.getByText("Preço sugerido por peça").nextElementSibling?.textContent,
  ).toBe(
    formatBRL(
      calculateV2({ ...lotFixture, machineFixedMinutes: "30" })
        .offeredUnitPrice,
    ),
  );
  fireEvent.change(screen.getByLabelText("Minutos de impressão do lote"), {
    target: { value: "70" },
  });
  expect(screen.queryByText("Preço sugerido por peça")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Aplicar estimativa",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("preserves advanced inputs across collapse and selection never adds a repeated material", () => {
  render(
    <GuidedPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={async () => {}}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Ajustes avançados" });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(trigger);
  const setup = screen.getByLabelText("Preparação (min/lote)");
  fireEvent.change(setup, { target: { value: "45" } });
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(
    (screen.getByLabelText("Preparação (min/lote)") as HTMLInputElement).value,
  ).toBe("45");
  const count = screen.getAllByLabelText(/^Material [0-9]+$/).length;
  fireEvent.change(screen.getByLabelText("Material 1"), {
    target: { value: pricingCatalog.materials[0].id },
  });
  expect(screen.getAllByLabelText(/^Material [0-9]+$/)).toHaveLength(count);
});
it("keeps values after an apply fails", async () => {
  const onApply = vi.fn(async () => {
    throw new Error("Sem conexão");
  });
  render(
    <GuidedPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={onApply}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Aplicar estimativa" }));
  await screen.findByText("Sem conexão");
  expect(
    (screen.getByLabelText("Quantidade do lote") as HTMLInputElement).value,
  ).toBe(String(lotFixture.quantity));
});

it("locks apply while a request is pending", async () => {
  let complete!: () => void;
  const onApply = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  render(
    <GuidedPricingForm
      catalog={pricingCatalog}
      initialInput={lotFixture}
      onApply={onApply}
    />,
  );
  const button = screen.getByRole("button", { name: "Aplicar estimativa" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByRole("button", { name: "Aplicando…" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  complete();
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Aplicar estimativa",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
});
