// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ComparisonEditor } from "@/components/pricing/comparisons/comparison-editor";
import { lotFixture as input } from "../fixtures/pricing";
import { requestFromInput } from "@/domain/pricing/resolve";
import { saveComparison } from "@/lib/pricing-comparisons-client";
import { BatchPricingForm } from "@/components/pricing/batch-pricing-form";
import { GuidedPricingForm } from "@/components/pricing/guided-pricing-form";
import { pricingCatalog } from "../fixtures/pricing-catalog";
vi.mock("@/lib/pricing-comparisons-client", () => ({
  saveComparison: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const catalog = {
  settings: null,
  materials: [],
  printers: [],
  extras: [],
  channels: [{ ...input.channel, ...input.channel.ref, active: true }],
};
it.each([BatchPricingForm, GuidedPricingForm])(
  "preserves comparison drafts through temporarily invalid productive input",
  (Form) => {
    render(
      <Form
        catalog={pricingCatalog}
        initialInput={input}
        onApply={async () => {}}
      />,
    );
    fireEvent.click(screen.getByText("Comparar canais e descontos"));
    fireEvent.change(screen.getByLabelText("Nome da comparação"), {
      target: { value: "Preservar" },
    });
    fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), {
      target: { value: "10" },
    });
    const consumption = screen.getByLabelText("Consumo por peça 1 (g)");
    fireEvent.change(consumption, { target: { value: "" } });
    fireEvent.change(consumption, { target: { value: "10" } });
    expect(
      (screen.getByLabelText("Nome da comparação") as HTMLInputElement).value,
    ).toBe("Preservar");
    expect(
      (screen.getByLabelText("Desconto 1 (%)") as HTMLInputElement).value,
    ).toBe("10");
  },
);
it.each([BatchPricingForm, GuidedPricingForm])(
  "offers a common-price comparison despite the main channel impossible margin",
  (Form) => {
    const high = {
      ...pricingCatalog,
      channels: pricingCatalog.channels.map((c) => ({
        ...c,
        fees: [{ label: "Taxa", percent: "75" }],
      })),
    };
    render(
      <Form
        catalog={high}
        initialInput={{ ...input, mode: "CONTRIBUTION" }}
        onApply={async () => {}}
      />,
    );
    fireEvent.click(screen.getByText("Comparar canais e descontos"));
    fireEvent.click(
      screen.getByRole("radio", { name: "Mesmo preço entre canais" }),
    );
    fireEvent.change(screen.getByLabelText("Preço comum por peça (R$)"), {
      target: { value: "30" },
    });
    expect(screen.getByRole("button", { name: "Usar oferta 1" })).toBeTruthy();
    expect(screen.getAllByText(/Taxas e meta somam/).length).toBeGreaterThan(0);
  },
);
it("does not apply the discount again when using an offer in the parent form", () => {
  render(
    <BatchPricingForm
      catalog={pricingCatalog}
      initialInput={input}
      onApply={async () => {}}
    />,
  );
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar oferta 1" }));
  expect(
    (screen.getByLabelText("Preço unitário informado (R$)") as HTMLInputElement)
      .value,
  ).toBe("11.24");
  expect(
    screen.getByText("Preço final por peça").nextElementSibling?.textContent,
  ).toBe("R$ 11,24");
});
it("uses only the final informed offer and clears results on invalid discount", () => {
  const use = vi.fn();
  render(
    <ComparisonEditor
      input={input}
      request={requestFromInput(input, 1)}
      catalog={catalog}
      onUseOffer={use}
    />,
  );
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), {
    target: { value: "10" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar oferta 1" }));
  expect(use).toHaveBeenCalledWith(input.channel.ref, "11.24");
  expect(saveComparison).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), {
    target: { value: "101" },
  });
  expect(screen.queryByRole("button", { name: "Usar oferta 1" })).toBeNull();
});
it("saves by explicit name and preserves the operation key on retry", async () => {
  vi.mocked(saveComparison)
    .mockRejectedValueOnce(Error("Tente novamente"))
    .mockResolvedValueOnce({ id: "saved", name: "Oferta direta" } as Awaited<
      ReturnType<typeof saveComparison>
    >);
  render(
    <ComparisonEditor
      input={input}
      request={requestFromInput(input, 1)}
      catalog={catalog}
      onUseOffer={() => {}}
    />,
  );
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Nome da comparação"), {
    target: { value: "Oferta direta" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar comparação" }));
  await screen.findByText("Tente novamente");
  fireEvent.click(screen.getByRole("button", { name: "Salvar comparação" }));
  await waitFor(() => expect(saveComparison).toHaveBeenCalledTimes(2));
  expect(vi.mocked(saveComparison).mock.calls[0][1]).toBe(
    vi.mocked(saveComparison).mock.calls[1][1],
  );
  expect(
    await screen.findByText(/Comparação salva: Oferta direta/),
  ).toBeTruthy();
});
