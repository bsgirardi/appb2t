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
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { pricingCatalog } from "../fixtures/pricing-catalog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const props = {
  initialData: { materials: [], printers: [], users: [], settings: null },
  catalog: pricingCatalog,
  commercial: { replyWaitDays: 14, version: 0 },
  tax: { profiles: [], version: 0 },
};
function select(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), {
    button: 0,
    ctrlKey: false,
  });
}
it("shows each subject only in its own tab and preserves drafts", () => {
  render(<SettingsWorkspace {...props} />);
  expect(
    screen.getByRole("button", { name: "Adicionar material" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("spinbutton", {
      name: "Prazo sem retorno (dias corridos)",
    }),
  ).toBeNull();
  expect(
    screen.queryByRole("textbox", { name: "Markup padrão (%)" }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Tarifa de energia (R$/kWh)"), {
    target: { value: "2" },
  });
  select("Precificação");
  expect(
    screen.queryByRole("textbox", { name: "Tarifa de energia (R$/kWh)" }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Markup padrão (%)"), {
    target: { value: "75" },
  });
  select("Canais e complementos");
  expect(screen.getByLabelText("Nome do canal")).toBeTruthy();
  expect(
    screen.queryByRole("textbox", { name: "Markup padrão (%)" }),
  ).toBeNull();
  select("Tributação");
  expect(
    screen.getByText(
      "Tributação para estimativas gerenciais. Configure por competência; a alíquota não é determinada automaticamente pelo CNPJ.",
    ),
  ).toBeTruthy();
  select("Alertas comerciais");
  fireEvent.change(screen.getByLabelText("Prazo sem retorno (dias corridos)"), {
    target: { value: "21" },
  });
  select("Equipe");
  expect(
    screen
      .getByRole("region", { name: "Equipe" })
      .getAttribute("aria-labelledby"),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Adicionar pessoa" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Nome do canal" })).toBeNull();
  select("Produção");
  expect(
    (screen.getByLabelText("Tarifa de energia (R$/kWh)") as HTMLInputElement)
      .value,
  ).toBe("2");
  select("Precificação");
  expect(
    (screen.getByLabelText("Markup padrão (%)") as HTMLInputElement).value,
  ).toBe("75");
  select("Alertas comerciais");
  expect(
    (
      screen.getByLabelText(
        "Prazo sem retorno (dias corridos)",
      ) as HTMLInputElement
    ).value,
  ).toBe("21");
  expect(
    screen.getAllByLabelText("Prazo sem retorno (dias corridos)"),
  ).toHaveLength(1);
});
it("uses the latest shared version for saves from production and pricing", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_url, options) => {
      const { expectedVersion, ...settings } = JSON.parse(
        options!.body as string,
      );
      return new Response(
        JSON.stringify({ data: { ...settings, version: expectedVersion + 1 } }),
      );
    });
  render(<SettingsWorkspace {...props} />);
  fireEvent.change(screen.getByLabelText("Tarifa de energia (R$/kWh)"), {
    target: { value: "2" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar custos de produção" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "Parâmetros salvos.",
    ),
  );
  select("Precificação");
  fireEvent.change(screen.getByLabelText("Markup padrão (%)"), {
    target: { value: "75" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar padrões de preço" }),
  );
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const first = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  const second = JSON.parse(fetcher.mock.calls[1][1]!.body as string);
  expect(second).toMatchObject({
    energyRate: "2",
    markupPercent: "75",
    expectedVersion: first.expectedVersion + 1,
  });
});
it("connects the outer tabs to their panels using keyboard navigation", async () => {
  render(<SettingsWorkspace {...props} />);
  const tabs = screen.getByRole("tablist", { name: "Áreas de configuração" });
  const first = within(tabs).getByRole("tab", { name: "Produção" });
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowRight" });
  await waitFor(() =>
    expect(
      within(tabs)
        .getByRole("tab", { name: "Precificação" })
        .getAttribute("aria-selected"),
    ).toBe("true"),
  );
  expect(screen.getByRole("tabpanel", { name: "Precificação" })).toBeTruthy();
});
