// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  act,
} from "@testing-library/react";
import { FinanceFilters } from "@/components/finance/filters";
import { CashFlow } from "@/components/finance/cash-flow";
import { EntryPanel } from "@/components/finance/entry-panel";
import { Pagination } from "@/components/finance/shared";
import { readingEntry } from "../fixtures/finance-reading";
import type { CashDay, EntryDTO } from "@/domain/finance/types";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("leva foco ao detalhe lido e devolve à linha ao fechar sem perder a seleção", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { ...readingEntry, settlements: [], events: [] },
      }),
      { status: 200 },
    ),
  );
  render(
    <EntryPanel
      accounts={[]}
      categories={[]}
      query={{ kind: "RECEIVABLE" }}
      result={{ items: [readingEntry], total: 1, page: 1, pageSize: 20 }}
    />,
  );
  const open = screen.getByRole("button", {
    name: `Ver detalhes de ${readingEntry.description}`,
  });
  fireEvent.click(open);
  const heading = await screen.findByRole("heading", {
    name: readingEntry.description,
  });
  expect(document.activeElement).toBe(heading);
  fireEvent.click(screen.getByRole("button", { name: "Fechar detalhe" }));
  expect(document.activeElement).toBe(open);
  expect(
    screen.getByRole("table", { name: "Títulos a pagar e receber" }),
  ).toBeTruthy();
});

it("mantém critérios visíveis e parâmetros de contexto no GET recolhido", () => {
  const { container } = render(
    <FinanceFilters
      action="/financeiro/lancamentos"
      entries
      query={{
        dateFrom: "2026-11-01",
        saleId: "sale",
        groupId: "group",
        counterparty: "Cliente longo",
        page: "4",
        pageSize: "10",
      }}
      accounts={[]}
      categories={[]}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Critérios financeiros aplicados" })
      .textContent,
  ).toContain("01/11/2026");
  expect(
    screen.getByRole("region", { name: "Critérios financeiros aplicados" })
      .textContent,
  ).toContain("Cliente longo");
  const data = new FormData(container.querySelector("form")!);
  expect(data.get("groupId")).toBe("group");
  expect(data.get("saleId")).toBe("sale");
  expect(data.get("pageSize")).toBe("10");
  expect(data.has("page")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  expect(screen.getByLabelText("Vencimento a partir de")).toBeTruthy();
});

it("separa data efetiva de vencimento e não converte saldo indisponível em zero", () => {
  const day: CashDay = {
    date: "2026-11-08",
    incoming: "0.00",
    outgoing: "20.00",
    transfersNet: "-10.00",
    adjustmentsNet: "0.00",
    closingBalance: null,
  };
  render(
    <CashFlow
      realized={[day]}
      projected={[{ ...day, closingBalance: "0.00" }]}
      overdueNet="-20.00"
    />,
  );
  const realized = screen.getByRole("table", {
    name: "Fluxo de caixa realizado",
  });
  const projected = screen.getByRole("table", {
    name: "Fluxo de caixa previsto",
  });
  expect(
    within(realized).getByRole("columnheader", { name: "Data efetiva" }),
  ).toBeTruthy();
  expect(
    within(projected).getByRole("columnheader", {
      name: "Vencimento previsto",
    }),
  ).toBeTruthy();
  expect(within(realized).getByText("Sem referência")).toBeTruthy();
  expect(within(projected).getAllByText("R$ 0,00").length).toBeGreaterThan(0);
  expect(within(realized).getByText("R$ -10,00")).toBeTruthy();
});

it("não declara ausência de títulos quando o período não tem linhas mas há vencidos", () => {
  render(<CashFlow realized={[]} projected={[]} overdueNet="100.00" />);
  expect(screen.getByText("R$ 100,00")).toBeTruthy();
  expect(screen.getByText("Nenhuma linha de projeção no período")).toBeTruthy();
  expect(
    screen.queryByText("Nenhum título em aberto nesta projeção"),
  ).toBeNull();
});

it("pagina preservando filtros e oferece primeira página sem declarar cadastro vazio", () => {
  render(
    <>
      <EntryPanel
        accounts={[]}
        categories={[]}
        query={{ kind: "PAYABLE" }}
        result={{ items: [], total: 31, page: 9, pageSize: 20 }}
      />
      <Pagination
        result={{ items: [], total: 31, page: 2, pageSize: 20 }}
        base="/financeiro/lancamentos"
        query={{ kind: "PAYABLE", pageSize: "20" }}
      />
    </>,
  );
  expect(screen.getByText("Esta página não tem títulos")).toBeTruthy();
  const url = new URL(
    screen
      .getByRole("link", { name: "Voltar à primeira página" })
      .getAttribute("href")!,
    "https://example.test",
  );
  expect(url.searchParams.get("kind")).toBe("PAYABLE");
  expect(url.searchParams.get("page")).toBe("1");
  expect(
    screen
      .getAllByRole("link", { name: "Anterior" })
      .some((l) => l.getAttribute("href")?.includes("kind=PAYABLE")),
  ).toBe(true);
});

it("informa leitura pendente, impede cliques concorrentes e recupera erro", async () => {
  let finish!: (value: Response) => void;
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const entry = {
    id: "e",
    description: "Título sintético",
    counterparty: "Cliente",
    dueDate: "2026-11-08",
    amount: "100.00",
    remainingAmount: "100.00",
    state: "ABERTO",
    kind: "RECEIVABLE",
  } as EntryDTO;
  render(
    <EntryPanel
      accounts={[]}
      categories={[]}
      query={{}}
      result={{ items: [entry], total: 1, page: 1, pageSize: 20 }}
    />,
  );
  const button = screen.getByRole("button", {
    name: "Ver detalhes de Título sintético",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toContain("Carregando título");
  await act(async () =>
    finish(
      new Response(
        JSON.stringify({
          error: { code: "INTERNAL", message: "Falha de consulta" },
        }),
        { status: 500 },
      ),
    ),
  );
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect((button as HTMLButtonElement).disabled).toBe(false);
});
