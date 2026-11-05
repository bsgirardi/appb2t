// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { OpportunityDecision } from "@/components/opportunities/decision";
import { QuoteConsolidation } from "@/components/opportunities/consolidation";
import type { QuoteDTO } from "@/domain/commerce/types";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture } from "../fixtures/pricing";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("clears temporary freight after a successful refresh and quote version change", async () => {
  const quote = {
    id: "q",
    number: "ORC-1",
    version: 1,
    status: "RASCUNHO" as const,
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            ...quote,
            input: { items: [], discount: "0", shipping: "0" },
            costs: null,
          },
        }),
      ),
  );
  const view = render(<OpportunityDecision quote={quote} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar indicadores" }),
  );
  await screen.findByLabelText("Custo de envio previsto (R$)");
  fireEvent.change(screen.getByLabelText("Custo de envio previsto (R$)"), {
    target: { value: "9" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Atualizar indicadores" }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByLabelText(
          "Custo de envio previsto (R$)",
        ) as HTMLInputElement
      ).value,
    ).toBe(""),
  );
  fireEvent.change(screen.getByLabelText("Custo de envio previsto (R$)"), {
    target: { value: "7" },
  });
  view.rerender(<OpportunityDecision quote={{ ...quote, version: 2 }} />);
  expect(screen.queryByLabelText("Custo de envio previsto (R$)")).toBeNull();
});
it("requires explicit zero, removes results on invalid premises and performs no request", () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  const item = {
    lineId: "a",
    description: "Peça",
    quantity: 10,
    unitPrice: "8",
  };
  const document = {
    input: { items: [item], discount: "8", shipping: "10" },
    costs: {
      revisionId: "r",
      bindings: [
        {
          lineId: "a",
          snapshotId: "s",
          fingerprint: lineFingerprint(item),
          state: "VALID",
        },
      ],
      snapshots: [
        {
          id: "s",
          version: 2,
          input: lotFixture,
          result: calculateV2(lotFixture),
          actorId: "a",
          actorName: "Equipe",
          createdAt: "2026-11-04T12:00:00Z",
        },
      ],
    },
  } as QuoteDTO;
  render(<QuoteConsolidation document={document} />);
  expect(screen.queryByText("Margem consolidada estimada")).toBeNull();
  fireEvent.change(screen.getByLabelText("Custo de envio previsto (R$)"), {
    target: { value: "6" },
  });
  fireEvent.change(
    screen.getByLabelText("Encargos previstos sobre o frete (R$)"),
    { target: { value: "1" } },
  );
  expect(screen.getByText("16,59%")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Custo de envio previsto (R$)"), {
    target: { value: "" },
  });
  expect(screen.queryByText("Margem consolidada estimada")).toBeNull();
  fireEvent.change(screen.getByLabelText("Custo de envio previsto (R$)"), {
    target: { value: "0" },
  });
  expect(screen.getByText("Margem consolidada estimada")).toBeTruthy();
  expect(fetcher).not.toHaveBeenCalled();
});
