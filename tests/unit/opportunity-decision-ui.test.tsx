// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OpportunityDecision } from "@/components/opportunities/decision";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const quote = {
  id: "q",
  number: "ORC-000001",
  version: 2,
  status: "RASCUNHO" as const,
};
it("loads only on request using GET and reports incomplete coverage and version changes", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          ...quote,
          version: 3,
          input: {
            items: [
              {
                lineId: "i",
                description: "Peça",
                quantity: 1,
                unitPrice: "10",
              },
            ],
            discount: "1",
            shipping: "2",
          },
          costs: null,
        },
      }),
    ),
  );
  render(<OpportunityDecision quote={quote} />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar indicadores" }),
  );
  await screen.findByText(/Versão consultada: 3/);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/quotes/q",
    expect.objectContaining({ method: "GET", cache: "no-store" }),
  );
  expect(screen.getByText(/0 de 1 itens/)).toBeTruthy();
  expect(screen.getByText(/O orçamento mudou/)).toBeTruthy();
  expect(screen.getByText(/Antes do desconto global/)).toBeTruthy();
});
it("removes old results when refreshing fails", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { ...quote, input: {}, costs: null } }),
      ),
    )
    .mockRejectedValueOnce(new Error("offline"));
  render(<OpportunityDecision quote={quote} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar indicadores" }),
  );
  await screen.findByText(/Versão consultada: 2/);
  fireEvent.click(
    screen.getByRole("button", { name: "Atualizar indicadores" }),
  );
  await screen.findByText(/Não foi possível conectar/);
  expect(screen.queryByText(/Versão consultada/)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("drops a pending response when the principal quote changes", async () => {
  let resolve!: (response: Response) => void;
  vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  const view = render(<OpportunityDecision quote={quote} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar indicadores" }),
  );
  view.rerender(
    <OpportunityDecision
      quote={{ ...quote, id: "new", number: "ORC-000002" }}
    />,
  );
  resolve(new Response(JSON.stringify({ data: { ...quote, input: {} } })));
  await Promise.resolve();
  expect(screen.getByText("ORC-000002")).toBeTruthy();
  expect(screen.queryByText(/Versão consultada/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Consultar indicadores" }),
  ).toBeTruthy();
});
