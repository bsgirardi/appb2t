// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { OpportunityForm } from "@/components/opportunities/form";
import { OpportunityDetail } from "@/components/opportunities/detail";
import { opportunity, opportunityOptions } from "../fixtures/opportunity";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("preserves edits and provides explicit refresh on a conflict", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { code: "CONFLICT", message: "Conflito de versão" },
      }),
      { status: 409 },
    ),
  );
  render(
    <OpportunityForm
      initial={opportunity}
      options={opportunityOptions}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: "Preservar alteração" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar oportunidade" }));
  await screen.findByText("Conflito de versão");
  expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
    "Preservar alteração",
  );
  expect(screen.getByRole("button", { name: /Recarregar/ })).toBeTruthy();
});
it("records interaction without clearing the next action and reuses retry key", async () => {
  const calls: Record<string, unknown>[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    throw new Error("offline");
  });
  render(
    <OpportunityDetail
      initial={opportunity}
      initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
      options={opportunityOptions}
    />,
  );
  fireEvent.change(screen.getByLabelText("Registrar interação"), {
    target: { value: "Cliente pediu retorno" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar interação" }));
  await screen.findByText(/Não foi possível conectar/);
  fireEvent.click(screen.getByRole("button", { name: "Salvar interação" }));
  await waitFor(() => expect(calls.length).toBe(2));
  expect(calls[0].operationKey).toBe(calls[1].operationKey);
  expect(screen.getByText("Ligar para confirmar")).toBeTruthy();
  expect(
    (screen.getByLabelText("Registrar interação") as HTMLTextAreaElement).value,
  ).toBe("Cliente pediu retorno");
});
it("keeps won opportunities read only and shows cancelled sale", () => {
  render(
    <OpportunityDetail
      initial={{
        ...opportunity,
        stage: "GANHO",
        nextAction: null,
        nextContactDate: null,
        wonSale: { id: "sale", number: "VEN-000001", status: "CANCELADA" },
      }}
      initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
      options={opportunityOptions}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Editar oportunidade" }),
  ).toBeNull();
  expect(screen.getByText(/venda foi cancelada/i)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "VEN-000001" }).getAttribute("href"),
  ).toBe("/vendas/sale");
  expect(screen.getByRole("button", { name: "Salvar interação" })).toBeTruthy();
});

it("only closes loss after explicit confirmation with reason and keeps text on error", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: "CONFLICT",
          message:
            "Retire a oferta privada ativa pelo atendimento antes de registrar a perda.",
        },
      }),
      { status: 409 },
    ),
  );
  render(
    <OpportunityDetail
      initial={opportunity}
      initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
      options={opportunityOptions}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Registrar perda" }));
  expect(
    screen.getByText(/Orçamentos e ofertas não serão cancelados/),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Motivo"), {
    target: { value: "Sem retorno do cliente" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar perda" }));
  await screen.findByText(
    "Retire a oferta privada ativa pelo atendimento antes de registrar a perda.",
  );
  expect((screen.getByLabelText("Motivo") as HTMLInputElement).value).toBe(
    "Sem retorno do cliente",
  );
  expect(screen.getByText("Ligar para confirmar")).toBeTruthy();
});
it("offers reopening with a new next contact instead of editable terminal data", () => {
  render(
    <OpportunityDetail
      initial={{
        ...opportunity,
        stage: "PERDIDO",
        nextAction: null,
        nextContactDate: null,
        lossReason: "Preço",
      }}
      initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
      options={opportunityOptions}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reabrir oportunidade" }));
  expect(screen.getByLabelText("Nova próxima ação")).toBeTruthy();
  expect(screen.getByLabelText("Nova data de contato")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Editar oportunidade" }),
  ).toBeNull();
});

it("records explicit send for the current principal without treating a note as reply", async () => {
  const calls: Record<string, unknown>[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    throw new Error("offline");
  });
  render(
    <OpportunityDetail
      initial={{
        ...opportunity,
        principalQuoteId: "q",
        quotes: [
          { id: "q", number: "ORC-000001", version: 2, status: "ENVIADO" },
        ],
      }}
      initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
      options={opportunityOptions}
    />,
  );
  fireEvent.change(screen.getByLabelText("Tipo de registro"), {
    target: { value: "PROPOSAL_SENT" },
  });
  fireEvent.change(screen.getByLabelText("Registrar interação"), {
    target: { value: "Proposta enviada por telefone" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar interação" }));
  await screen.findByText(/Não foi possível conectar/);
  expect(calls[0]).toMatchObject({
    action: "PROPOSAL_SENT",
    quoteId: "q",
    quoteVersion: 2,
  });
});
