// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { TaxSettingsPanel } from "@/components/settings/tax-settings-panel";
import { TaxFields } from "@/components/pricing/tax-fields";
import { PricingResult } from "@/components/pricing/pricing-result";
import { lotFixture } from "../fixtures/pricing";
import { calculatePricing } from "@/domain/pricing/calculate-fiscal";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("não preenche alíquota fictícia e exige conferência explícita para salvar", () => {
  render(<TaxSettingsPanel initial={{ version: 0, profiles: [] }} />);
  expect(
    (screen.getByLabelText("DAS mensal (R$)") as HTMLInputElement).value,
  ).toBe("");
  expect(
    (
      screen.getByRole("button", {
        name: "Salvar nova revisão fiscal",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Simples Nacional" }));
  expect(
    (screen.getByLabelText("Alíquota efetiva estimada (%)") as HTMLInputElement)
      .value,
  ).toBe("");
});
it("guarda rascunho em erro e envia DAS sem percentual de venda", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Offline"));
  render(<TaxSettingsPanel initial={{ version: 0, profiles: [] }} />);
  fireEvent.change(screen.getByLabelText("DAS mensal (R$)"), {
    target: { value: "87,05" },
  });
  fireEvent.click(screen.getByLabelText(/Confirmo que a premissa/));
  fireEvent.click(screen.getByLabelText(/Conferi as taxas/));
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar nova revisão fiscal" }),
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const payload = JSON.parse(String(fetch.mock.calls[0][1]?.body));
  expect(payload).toMatchObject({
    regime: "MEI",
    percent: null,
    monthlyDas: "87,05",
    expectedVersion: 0,
  });
  expect(
    (screen.getByLabelText("DAS mensal (R$)") as HTMLInputElement).value,
  ).toBe("87,05");
});
it("abre detalhes e identifica o campo quando a validação fiscal recusa origem ausente", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION",
          message: "Verifique os campos",
          fields: { source: "Informe a origem conferida." },
        },
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    ),
  );
  render(<TaxSettingsPanel initial={{ version: 0, profiles: [] }} />);
  fireEvent.click(screen.getByLabelText(/Confirmo que a premissa/));
  fireEvent.click(screen.getByLabelText(/Conferi as taxas/));
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar nova revisão fiscal" }),
  );
  await screen.findByText("Informe a origem conferida.");
  expect(
    screen.getByLabelText("Origem dos parâmetros").getAttribute("aria-invalid"),
  ).toBe("true");
  expect(
    screen.getByLabelText("Origem dos parâmetros").closest("details")?.open,
  ).toBe(true);
});
it("expõe operação e competência sem cadastro fiscal a cada cálculo", () => {
  const onChange = vi.fn();
  render(
    <TaxFields
      value={{
        competence: "2026-11",
        operation: "PRODUCT",
        expectedVersion: 0,
      }}
      onChange={onChange}
    />,
  );
  fireEvent.change(screen.getByLabelText("Operação para estimativa"), {
    target: { value: "OTHER" },
  });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ operation: "OTHER" }),
  );
});
it("mostra perfil fiscal mesmo antes de preencher material e impressora", () => {
  render(
    <TaxFields
      value={{
        competence: "2026-11",
        operation: "PRODUCT",
        expectedVersion: 1,
      }}
      profiles={[
        {
          id: "r1",
          revision: 1,
          regime: "SIMPLES",
          startsAt: "2026-11",
          endsAt: "2026-12",
          percent: "4",
          scope: "Produtos",
        },
      ]}
      onChange={() => {}}
    />,
  );
  expect(screen.getByText("Simples: alíquota informada")).toBeTruthy();
});
it("resultado sem perfil identifica tributos desconhecidos em vez de prometer resultado completo", () => {
  const input = {
    ...lotFixture,
    tax: {
      algorithm: 1 as const,
      competence: "2026-11",
      operation: "PRODUCT" as const,
      profile: null,
    },
  };
  render(<PricingResult input={input} result={calculatePricing(input)} />);
  expect(screen.getByText("Cobertura tributária indisponível")).toBeTruthy();
  expect(
    screen.getByText("Contribuição antes de tributos não identificados"),
  ).toBeTruthy();
});
