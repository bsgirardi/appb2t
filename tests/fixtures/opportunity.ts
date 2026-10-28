import type {
  OpportunityDTO,
  OpportunityOptions,
} from "@/domain/opportunities/types";
export const opportunity: OpportunityDTO = {
  id: "opp",
  title: "Lote de peças",
  customerId: "c",
  ownerId: "u",
  stage: "CONTATO",
  nextAction: "Ligar para confirmar",
  nextContactDate: "2026-10-27",
  pendingNotes: "Confirmar cor",
  lossReason: null,
  version: 1,
  customer: { id: "c", name: "Cliente", active: true },
  owner: { id: "u", name: "Equipe", active: true },
  principalQuoteId: null,
  quotes: [],
  wonSale: null,
  createdAt: "2026-10-27T10:00:00Z",
  updatedAt: "2026-10-27T10:00:00Z",
};
export const opportunityOptions: OpportunityOptions = {
  customers: [opportunity.customer],
  owners: [opportunity.owner],
};
