// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ComparisonEditor } from "@/components/pricing/comparisons/comparison-editor";
import { lotFixture as input } from "../fixtures/pricing";
import { requestFromInput } from "@/domain/pricing/resolve";
import { saveComparison } from "@/lib/pricing-comparisons-client";
vi.mock("@/lib/pricing-comparisons-client", () => ({ saveComparison: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const catalog = { settings: null, materials: [], printers: [], extras: [], channels: [{ ...input.channel, ...input.channel.ref, active: true }] };
it("uses only the final informed offer and clears results on invalid discount", () => {
  const use = vi.fn();
  render(<ComparisonEditor input={input} request={requestFromInput(input, 1)} catalog={catalog} onUseOffer={use} />);
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Usar oferta 1" }));
  expect(use).toHaveBeenCalledWith(input.channel.ref, "11.24");
  expect(saveComparison).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Desconto 1 (%)"), { target: { value: "101" } });
  expect(screen.queryByRole("button", { name: "Usar oferta 1" })).toBeNull();
});
it("saves by explicit name and preserves the operation key on retry", async () => {
  vi.mocked(saveComparison).mockRejectedValueOnce(Error("Tente novamente")).mockResolvedValueOnce({ id: "saved", name: "Oferta direta" } as Awaited<ReturnType<typeof saveComparison>>);
  render(<ComparisonEditor input={input} request={requestFromInput(input, 1)} catalog={catalog} onUseOffer={() => {}} />);
  fireEvent.click(screen.getByText("Comparar canais e descontos"));
  fireEvent.change(screen.getByLabelText("Nome da comparação"), { target: { value: "Oferta direta" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar comparação" }));
  await screen.findByText("Tente novamente");
  fireEvent.click(screen.getByRole("button", { name: "Salvar comparação" }));
  await waitFor(() => expect(saveComparison).toHaveBeenCalledTimes(2));
  expect(vi.mocked(saveComparison).mock.calls[0][1]).toBe(vi.mocked(saveComparison).mock.calls[1][1]);
  expect(await screen.findByText(/Comparação salva: Oferta direta/)).toBeTruthy();
});
