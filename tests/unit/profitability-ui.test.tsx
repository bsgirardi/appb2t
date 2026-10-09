// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProfitabilityDetail } from "@/components/profitability/detail";
import { RevisionForm } from "@/components/profitability/revision-form";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
it("shows missing costs without partial profit and labels opening composition", () => {
  const view = render(
    <ProfitabilityDetail value={calculateSale(profitabilityInput())} />,
  );
  expect(screen.getAllByText("Indisponível").length).toBeGreaterThan(0);
  const i = completeInput();
  i.lines[0].actual.components = null;
  view.rerender(<ProfitabilityDetail value={calculateSale(i)} />);
  expect(
    screen.getByText("Resultado após custo total — composição indisponível"),
  ).toBeTruthy();
});
it("recovers original request after timeout and preserves edits across remount", async () => {
  const requests: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      requests.push(payload);
      if (requests.length === 1) throw new TypeError("offline");
      return new Response(JSON.stringify({ data: { version: 1 } }), {
        status: 200,
      });
    }),
  );
  const props = {
    value: calculateSale(profitabilityInput()),
    actorId: "admin",
    channels: [],
    onDone: () => {},
  };
  const view = render(<RevisionForm {...props} />);
  fireEvent.change(screen.getByLabelText("Encargos efetivos (R$)"), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByLabelText("Justificativa"), {
    target: { value: "Conferência inicial" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Salvar conferência" }).closest("form")!,
  );
  await screen.findByText(/resposta não foi confirmada/i);
  fireEvent.change(screen.getByLabelText("Encargos efetivos (R$)"), {
    target: { value: "15" },
  });
  view.unmount();
  render(<RevisionForm {...props} />);
  expect(
    (screen.getByLabelText("Encargos efetivos (R$)") as HTMLInputElement).value,
  ).toBe("15");
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Recuperar tentativa" })
      .closest("form")!,
  );
  await waitFor(() => expect(requests.length).toBe(2));
  expect(requests[1]).toEqual(requests[0]);
  await screen.findByText(/conferência salva/i);
  fireEvent.submit(
    screen.getByRole("button", { name: "Salvar conferência" }).closest("form")!,
  );
  await waitFor(() => expect(requests.length).toBe(3));
  expect(requests[2]).toMatchObject({
    expectedVersion: 1,
    payload: { fees: { state: "DECLARED", value: "15" } },
  });
  expect(requests[2].operationKey).not.toBe(requests[0].operationKey);
});
