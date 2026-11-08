import { createRoot } from "react-dom/client";
import { CustomerPanel } from "@/components/customers/customer-panel";
import { OpportunityPanel } from "@/components/opportunities/panel";
import { OpportunityDetail } from "@/components/opportunities/detail";
import { RequestPanel } from "@/components/catalog-requests/request-panel";
import { RequestDetail } from "@/components/catalog-requests/request-detail";
import { AppShell } from "@/components/shell/app-shell";
import { opportunity, opportunityOptions } from "./fixtures/opportunity";
import { listCustomer } from "./fixtures/commerce-lists";
import { opportunityFilterSchema } from "@/domain/opportunities/validation";
import "@/app/design.css";

// Presentation fixtures only. No operational API, authentication or writes.
window.fetch = async () => {
  throw new Error("Prévia sintética sem acesso à rede.");
};
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const empty = params.has("empty") || params.has("outside");
const page = {
  total: params.has("outside") ? 30 : params.has("empty") ? 0 : 2,
  page: params.has("outside") ? 9 : 1,
  pageSize: 20,
};
const long =
  "Associação sintética de artesãos e projetos personalizados para exposições e eventos corporativos";
const op = {
  ...opportunity,
  title: `${long} — lote de peças com especificação extensa`,
  customer: { ...opportunity.customer, name: long },
  pendingNotes:
    "Confirmar acabamento e condição de entrega antes de enviar uma nova proposta.",
  principalQuoteId: "q",
  quotes: [
    {
      id: "q",
      number: "ORC-2026-000001",
      version: 2,
      status: "ENVIADO" as const,
    },
  ],
};
const requests = ["RECEBIDA", "ORCAMENTO_PREPARADO"].map((state, i) => ({
  id: `r-${i}`,
  protocol: `SOL-2026-00000${i + 1}`,
  state: state as "RECEBIDA" | "ORCAMENTO_PREPARADO",
  version: 1,
  name: long,
  preferredChannel: "email" as const,
  createdAt: "2026-11-08T10:00:00Z",
  lineCount: 3,
  consultCount: 1,
  assigneeId: null,
  assigneeName: null,
  quoteId: i ? "q" : null,
}));
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "preview",
      name: "Revisão sintética",
      email: "preview@example.test",
      role: "ADMIN",
    }}
  >
    {params.get("view") === "customers" ? (
      <CustomerPanel
        initial={{
          ...page,
          items: empty
            ? []
            : [
                {
                  ...listCustomer,
                  email: "contato.comercial.extenso.para.inspecao@example.test",
                  phone: "(11) 99999-0000",
                },
                { ...listCustomer, id: "second", active: false },
              ],
        }}
        search="Associação"
        active="all"
      />
    ) : params.get("view") === "requests" ? (
      <RequestPanel
        initial={{ ...page, items: empty ? [] : requests }}
        filters={{ search: "Associação", state: "all" }}
      />
    ) : params.get("view") === "request-detail" ? (
      <RequestDetail
        initial={{
          ...requests[0],
          lineCount: 1,
          contact: {
            name: long,
            preferredChannel: "email",
            email: "contato.comercial.extenso@example.test",
            phone: "",
          },
          lines: [
            {
              schemaVersion: 1,
              lineId: "line",
              productId: "p",
              commercialRevision: 1,
              name: "Peça personalizada sintética",
              sku: "",
              color: "",
              size: "",
              answers: [],
              answerLabels: [],
              quantity: 3,
              priceKind: "CONSULT",
              unitPrice: null,
              subtotal: null,
              included: "",
              leadTimeCondition: "Prazo a confirmar após revisão",
              productionLeadDays: null,
              paymentTerms: "A combinar",
            },
          ],
          knownTotal: null,
          events: [],
          currentProducts: [
            {
              id: "p",
              name: "Peça personalizada sintética",
              active: true,
              availability: "AVAILABLE",
              commercialRevision: 1,
            },
          ],
        }}
        users={[{ id: "u", name: "Equipe sintética" }]}
        actorId="u"
        customers={[]}
        returnTo="/solicitacoes?search=Associação&page=2"
      />
    ) : params.get("view") === "detail" ? (
      <OpportunityDetail
        initial={op}
        initialEvents={{ items: [], total: 0, page: 1, pageSize: 20 }}
        options={opportunityOptions}
        returnTo="/negociacoes?search=Associação&page=2"
      />
    ) : (
      <OpportunityPanel
        initial={{
          ...page,
          items: empty
            ? []
            : [
                op,
                {
                  ...opportunity,
                  id: "second",
                  stage: "PERDIDO",
                  nextAction: null,
                  nextContactDate: null,
                  lossReason: "Cliente decidiu adiar o projeto.",
                },
              ],
        }}
        filters={opportunityFilterSchema.parse({
          search: "Associação",
          stage: "todas",
          owner: "eu",
        })}
        options={opportunityOptions}
        actorId="u"
      />
    )}
  </AppShell>,
);
