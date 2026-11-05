// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import {
  CommercialForecast,
  SalePlanningForecast,
} from "@/components/planning/commercial-forecast";
import { useCommercialQuery } from "@/components/planning/commercial-query";
import { CommercialScenarioForm } from "@/components/planning/commercial-scenario-form";
import {
  localPlanningTime,
  planningInstant,
} from "@/components/planning/commercial-time";
import type { CommercialContext } from "@/server/planning/commercial-read";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/client-api", () => ({ api }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  api.mockReset();
});
it("guides selection and directs won negotiation to actual sale", () => {
  const { rerender } = render(
    <CommercialForecast
      opportunityId="o"
      principalQuote={null}
      wonSale={null}
    />,
  );
  expect(screen.getByText(/Defina um orçamento principal/)).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
  rerender(
    <CommercialForecast
      opportunityId="o"
      principalQuote={null}
      wonSale={{ id: "s" }}
    />,
  );
  expect(
    screen
      .getByRole("link", { name: /Consultar previsão da venda/ })
      .getAttribute("href"),
  ).toBe("/vendas/s");
});
function Harness() {
  const q = useCommercialQuery<{ expiresAt: string; value: string }>();
  return (
    <>
      <button onClick={() => void q.run(() => api())}>ler</button>
      <button onClick={q.invalidate}>editar</button>
      <p>{q.result?.value ?? "sem resultado"}</p>
    </>
  );
}
it("expires at sixty seconds and ignores a late response after an edit", async () => {
  vi.useFakeTimers();
  api.mockResolvedValue({
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    value: "vigente",
  });
  render(<Harness />);
  await act(async () => fireEvent.click(screen.getByText("ler")));
  expect(screen.getByText("vigente")).toBeTruthy();
  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByText("sem resultado")).toBeTruthy();
  let resolve!: (x: unknown) => void;
  api.mockReturnValue(new Promise((r) => (resolve = r)));
  fireEvent.click(screen.getByText("ler"));
  fireEvent.click(screen.getByText("editar"));
  await act(async () =>
    resolve({
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      value: "antigo",
    }),
  );
  expect(screen.queryByText("antigo")).toBeNull();
});
it("shows actual uncovered quantities and keeps delivery unavailable", async () => {
  api.mockResolvedValue({
    asOf: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    revision: 1,
    source: { version: 1 },
    result: {
      demand: {
        allDelivered: false,
        completeCoverage: false,
        removalAt: null,
        issues: [],
        lines: [
          {
            lineKey: "x",
            description: "Peça",
            delivered: 2,
            readyCommitted: 3,
            planned: 4,
            uncovered: 1,
            removalAt: null,
            issues: [],
          },
        ],
      },
      completion: {
        removalAt: null,
        releaseAt: null,
        deliveryAt: null,
        issues: ["Sem cobertura"],
      },
      agreedDate: null,
    },
  });
  render(<SalePlanningForecast saleId="s" saleVersion={1} />);
  fireEvent.click(screen.getByRole("button", { name: /Consultar previsão/ }));
  await waitFor(() =>
    expect(screen.getByText("Sem cobertura", { exact: true })).toBeTruthy(),
  );
  expect(screen.getByText(/Sem cobertura: 1/)).toBeTruthy();
});
it("converts Sao Paulo times independently of device timezone and permits clearing a field", () => {
  expect(planningInstant("2026-11-04T09:00")).toBe("2026-11-04T12:00:00.000Z");
  expect(localPlanningTime("")).toBe("");
});
it("keeps all quote lines and requires review when splitting hypothetical batches", () => {
  const context = {
    asOf: new Date().toISOString(),
    lines: [
      {
        lineKey: "x",
        description: "Peça alfa",
        quantity: 2,
        technology: "FDM",
        suggestion: null,
      },
    ],
    printers: [],
    materials: [],
  } as unknown as CommercialContext;
  const invalidate = vi.fn();
  render(
    <CommercialScenarioForm
      context={context}
      busy={false}
      onChange={invalidate}
      onSubmit={vi.fn()}
    />,
  );
  expect(screen.getByText(/Peça alfa/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Dividir/ }));
  expect(screen.getAllByLabelText(/Revisei unidades/)).toHaveLength(2);
  expect(screen.getByText(/Distribuído: 3 de 2/)).toBeTruthy();
  expect(invalidate).toHaveBeenCalled();
});
it("invalidates on return to the page and ignores older request resolving last", async () => {
  const resolves: ((value: unknown) => void)[] = [];
  api.mockImplementation(() => new Promise((r) => resolves.push(r)));
  render(<Harness />);
  fireEvent.click(screen.getByText("ler"));
  fireEvent.click(screen.getByText("ler"));
  await act(async () =>
    resolves[1]({
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      value: "novo",
    }),
  );
  await act(async () =>
    resolves[0]({
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      value: "velho",
    }),
  );
  expect(screen.getByText("novo")).toBeTruthy();
  fireEvent(window, new Event("focus"));
  expect(screen.getByText("sem resultado")).toBeTruthy();
});
