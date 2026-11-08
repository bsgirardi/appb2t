// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { TaxReportPanel } from "@/components/finance/tax-report";
import { readingReport } from "../fixtures/finance-reading";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  push.mockClear();
});

it("destaca cobertura incompleta mesmo quando a parcela conhecida é zero", () => {
  render(<TaxReportPanel report={readingReport} memories={[]} />);
  expect(screen.getByText("Cobertura incompleta nesta consulta")).toBeTruthy();
  expect(
    screen.getByText(/zero na parcela conhecida não significa isenção/),
  ).toBeTruthy();
  expect(screen.getByText("Perfil mensal indisponível")).toBeTruthy();
  expect(screen.getByText(/Tributo indisponível/)).toBeTruthy();
});

it("mantém DAS MEI separado e expõe fonte e vigência do perfil mensal", () => {
  const profile = {
    id: "p",
    actorName: "Pessoa sintética",
    createdAt: readingReport.readAt,
    revision: 3,
    regime: "MEI" as const,
    startsAt: "2026-10",
    endsAt: "2026-12",
    monthlyDas: "87.05",
    percent: null,
    scope: "Produtos",
    source: "Fonte sintética conferida",
    checkedOn: "2026-11-01",
    verification: "INFORMED" as const,
    reason: "Ensaio sintético",
    productsConfirmed: true as const,
    channelsReviewed: true as const,
    replacesId: null,
  };
  render(
    <TaxReportPanel
      report={{
        ...readingReport,
        monthlyDas: "87.05",
        monthlyProfile: profile,
      }}
      memories={[]}
    />,
  );
  expect(screen.getByText(/Fonte sintética conferida/)).toBeTruthy();
  expect(screen.getByText(/2026-10 a 2026-12/)).toBeTruthy();
  expect(screen.getByText(/Informado, sem conferência declarada/)).toBeTruthy();
  expect(screen.getByText("R$ 87,05")).toBeTruthy();
});

it("não apresenta DAS como zero no Simples e retorna à consulta corrente da memória", () => {
  const profile = {
    id: "p",
    actorName: "Pessoa sintética",
    createdAt: readingReport.readAt,
    revision: 1,
    regime: "SIMPLES" as const,
    startsAt: "2026-11",
    endsAt: "2026-12",
    percent: "4",
    monthlyDas: null,
    scope: "Produtos",
    source: "Fonte sintética",
    checkedOn: "2026-11-01",
    verification: "CHECKED" as const,
    reason: "Ensaio sintético",
    productsConfirmed: true as const,
    channelsReviewed: true as const,
    replacesId: null,
  };
  const report = { ...readingReport, monthlyProfile: profile };
  render(
    <TaxReportPanel
      report={report}
      memories={[]}
      memory={{
        id: "m",
        createdAt: report.readAt,
        actorName: "Pessoa sintética",
        result: report,
      }}
    />,
  );
  expect(screen.getByText("Não se aplica ao perfil Simples")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Consultar visão corrente desta competência" })
      .getAttribute("href"),
  ).toBe("/financeiro/tributos?competence=2026-11");
  expect(
    screen.queryByRole("button", { name: "Salvar memória do resumo" }),
  ).toBeNull();
});

it("salva uma única vez durante pending e reutiliza a operação após resposta incerta", async () => {
  let fail!: (error: Error) => void;
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "saved" } }), { status: 200 }),
    );
  render(<TaxReportPanel report={readingReport} memories={[]} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar memória do resumo" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvando…" }));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toContain("Salvando memória");
  await act(async () => fail(new TypeError("Offline")));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar memória do resumo" }),
  );
  await vi.waitFor(() =>
    expect(push).toHaveBeenCalledWith("/financeiro/tributos?memory=saved"),
  );
  const payloads = fetch.mock.calls.map((c) => JSON.parse(String(c[1]?.body)));
  expect(payloads[0]).toEqual(payloads[1]);
});
