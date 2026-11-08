// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { CustomerPanel } from "@/components/customers/customer-panel";
import { OpportunityPanel } from "@/components/opportunities/panel";
import { RequestPanel } from "@/components/catalog-requests/request-panel";
import { listCustomer } from "../fixtures/commerce-lists";
import { opportunity, opportunityOptions } from "../fixtures/opportunity";
import { opportunityFilterSchema } from "@/domain/opportunities/validation";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const page = { total: 1, page: 2, pageSize: 20 };
const request = {
  id: "request",
  protocol: "SOL-1",
  state: "ORCAMENTO_PREPARADO" as const,
  version: 1,
  name: "Contato recebido",
  preferredChannel: "email" as const,
  createdAt: "2026-11-08T10:00:00Z",
  lineCount: 3,
  consultCount: 1,
  assigneeId: null,
  assigneeName: null,
  quoteId: "quote",
};
it("shows missing contacts without presenting a known customer as unknown", () => {
  const { rerender } = render(
    <CustomerPanel
      initial={{ ...page, items: [listCustomer] }}
      search=""
      active="all"
    />,
  );
  expect(screen.getByText(listCustomer.name)).toBeTruthy();
  expect(screen.getAllByText("Não informado")).toHaveLength(2);
  expect(screen.queryByText(/desconhecido/i)).toBeNull();
  rerender(
    <CustomerPanel
      initial={{ ...page, total: 0, items: [] }}
      search=""
      active="all"
    />,
  );
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByText("Nenhum cliente cadastrado")).toBeTruthy();
});
it("shows prepared request and quote link without claiming the proposal was sent", () => {
  const props = {
    initial: { ...page, items: [request] },
    filters: { search: "Contato", state: "ORCAMENTO_PREPARADO" },
  };
  const { rerender } = render(<RequestPanel {...props} />);
  expect(
    screen
      .getByRole("link", { name: "Abrir orçamento vinculado" })
      .getAttribute("href"),
  ).toBe("/orcamentos/quote");
  expect(screen.queryByText(/proposta enviada/i)).toBeNull();
  const link = screen.getByRole("link", { name: "SOL-1" });
  const back = new URL(
    new URL(link.getAttribute("href")!, "http://localhost").searchParams.get(
      "returnTo",
    )!,
    "http://localhost",
  );
  expect(back.searchParams.get("page")).toBe("2");
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText("Buscar por protocolo ou nome"), {
    target: { value: "Rascunho" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  expect(
    (screen.getByLabelText("Buscar por protocolo ou nome") as HTMLInputElement)
      .value,
  ).toBe("Rascunho");
  rerender(
    <RequestPanel {...props} filters={{ search: "Outro", state: "all" }} />,
  );
  rerender(<RequestPanel {...props} />);
  expect(
    (screen.getByLabelText("Buscar por protocolo ou nome") as HTMLInputElement)
      .value,
  ).toBe("Contato");
});
it("shows both customer contacts and applied criteria while preserving a filter draft", () => {
  render(
    <CustomerPanel
      initial={{
        ...page,
        items: [
          {
            ...listCustomer,
            email: "contato@example.test",
            phone: "11999990000",
          },
        ],
      }}
      search="Associação"
      active="true"
    />,
  );
  expect(screen.getByText("contato@example.test")).toBeTruthy();
  expect(screen.getByText("11999990000")).toBeTruthy();
  const applied = screen.getByRole("region", { name: "Filtros aplicados" });
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  fireEvent.change(screen.getByLabelText("Buscar cliente"), {
    target: { value: "Rascunho" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  expect(within(applied).getByText("Busca: Associação")).toBeTruthy();
  expect(within(applied).queryByText(/Rascunho/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
  expect(
    (screen.getByLabelText("Buscar cliente") as HTMLInputElement).value,
  ).toBe("Rascunho");
});
it("describes open opportunities and identifies the principal without conflating other versions", () => {
  render(
    <OpportunityPanel
      initial={{
        ...page,
        items: [
          {
            ...opportunity,
            principalQuoteId: "q",
            quotes: [
              { id: "q", number: "ORC-1", version: 2, status: "ENVIADO" },
              { id: "other", number: "ORC-2", version: 1, status: "RASCUNHO" },
            ],
          },
        ],
      }}
      filters={opportunityFilterSchema.parse({ search: "Lote" })}
      options={opportunityOptions}
      actorId="u"
    />,
  );
  expect(
    within(screen.getByRole("region", { name: "Filtros aplicados" })).getByText(
      "Etapa: Abertas",
    ),
  ).toBeTruthy();
  expect(screen.getByText(/Principal: ORC-1/)).toBeTruthy();
  expect(screen.getByText("Confirmar cor")).toBeTruthy();
  const link = screen.getByRole("link", { name: "Lote de peças" });
  const target = new URL(link.getAttribute("href")!, "http://localhost");
  const back = new URL(
    target.searchParams.get("returnTo")!,
    "http://localhost",
  );
  expect(back.pathname).toBe("/negociacoes");
  expect(back.searchParams.get("search")).toBe("Lote");
  expect(back.searchParams.get("page")).toBe("2");
});
it("distinguishes a request outside the result page and retains criteria on recovery", () => {
  render(
    <RequestPanel
      initial={{ ...page, total: 30, page: 9, items: [] }}
      filters={{ search: "Ana", state: "RECEBIDA" }}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Filtros aplicados" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Voltar à primeira página" }),
  );
  const target = new URL(push.mock.calls[0][0], "http://localhost");
  expect(target.searchParams.get("search")).toBe("Ana");
  expect(target.searchParams.get("state")).toBe("RECEBIDA");
  expect(target.searchParams.get("page")).toBe("1");
});
