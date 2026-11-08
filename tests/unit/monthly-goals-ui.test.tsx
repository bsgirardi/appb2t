// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MonthlyGoals } from "@/components/profitability/monthly-goals";
import { aggregateSales } from "@/domain/profitability/aggregate";
import {
  emptyGoals,
  monthPeriod,
  monthlyPerformance,
} from "@/domain/profitability/monthly-goals";
const summary = aggregateSales([]).summary;
const period = monthPeriod("2026-11", "2026-11-05");
const data = {
  editorId: "admin",
  month: "2026-11",
  version: 0,
  values: emptyGoals,
  period,
  summary,
  performance: monthlyPerformance(summary, emptyGoals, period),
  history: { page: 1, total: 0, items: [] },
  readAt: "2026-11-05T12:00:00Z",
};
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
it("labels missing targets, incomplete contribution, source and estimate", () => {
  render(<MonthlyGoals initial={data} />);
  expect(screen.getAllByText(/Meta salva: Não definida/)).toHaveLength(3);
  expect(screen.getAllByText(/Meta não definida — sem percentual/)).toHaveLength(3);
  expect(screen.getByText(/Cobertura da contribuição: 0\/0/)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /Conferir pedidos/ }).getAttribute("href"),
  ).toBe("/rentabilidade?from=2026-11-01&to=2026-11-05");
  expect(screen.getByText(/Estimativa por dias corridos/)).toBeTruthy();
});
it("recovers a draft after history navigation and refuses silent rebasing", async () => {
  const view = render(<MonthlyGoals initial={data} />);
  fireEvent.change(screen.getByLabelText("Meta de faturamento (R$)"), {
    target: { value: "123" },
  });
  fireEvent.change(screen.getByLabelText("Motivo da revisão"), {
    target: { value: "Rascunho" },
  });
  view.unmount();
  render(<MonthlyGoals initial={{ ...data, version: 1 }} />);
  await screen.findByText(/Rascunho recuperado/);
  expect(
    (screen.getByLabelText("Meta de faturamento (R$)") as HTMLInputElement)
      .value,
  ).toBe("123");
  expect(
    screen.getByRole("button", { name: "Consultar versão atual" }),
  ).toBeTruthy();
});
it("preserves entries on conflict and requires explicit review of new version", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: { message: "Outra pessoa alterou" } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          ...data,
          version: 1,
          values: { ...emptyGoals, revenue: "500.00" },
        },
      }),
    });
  vi.stubGlobal("fetch", fetcher);
  render(<MonthlyGoals initial={data} />);
  fireEvent.change(screen.getByLabelText("Meta de faturamento (R$)"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByLabelText("Motivo da revisão"), {
    target: { value: "Planejamento" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar metas" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar e salvar revisão" }),
  );
  await screen.findByText(/Outra pessoa alterou/);
  expect(
    (screen.getByLabelText("Meta de faturamento (R$)") as HTMLInputElement)
      .value,
  ).toBe("100");
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar versão atual" }),
  );
  await waitFor(() =>
    expect(screen.getByText(/Versão atual consultada/)).toBeTruthy(),
  );
  expect(
    (screen.getByLabelText("Meta de faturamento (R$)") as HTMLInputElement)
      .value,
  ).toBe("100");
  expect(
    screen.queryByRole("button", { name: "Confirmar e salvar revisão" }),
  ).toBeNull();
});
it("requires review if another revision lands between save and refreshed reading", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { version: 1, values: { ...emptyGoals, revenue: "100.00" } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...data,
            version: 2,
            values: { ...emptyGoals, revenue: "500.00" },
          },
        }),
      }),
  );
  render(<MonthlyGoals initial={data} />);
  fireEvent.change(screen.getByLabelText("Meta de faturamento (R$)"), {
    target: { value: "100" },
  });
  fireEvent.change(screen.getByLabelText("Motivo da revisão"), {
    target: { value: "Planejamento" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar metas" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar e salvar revisão" }),
  );
  await screen.findByRole("button", { name: "Consultar versão atual" });
  expect(
    (screen.getByLabelText("Meta de faturamento (R$)") as HTMLInputElement)
      .value,
  ).toBe("100.00");
});
