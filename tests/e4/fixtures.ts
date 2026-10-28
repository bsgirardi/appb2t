import { randomUUID } from "node:crypto";
import { seedUser } from "./setup";
import { saveCustomer } from "@/server/customers";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { executeOpportunityCommand } from "@/server/opportunities/commands";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export const key = () => randomUUID();
export async function fixture() {
  const actor = await seedUser();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente E4",
    type: "PERSON",
    active: true,
  });
  const fields = {
    title: "Lote E4",
    customerId: customer.id,
    ownerId: actor.id,
    stage: "CONTATO" as const,
    nextAction: "Ligar",
    nextContactDate: todaySaoPaulo(new Date()),
    pendingNotes: "PRIVADO-E4",
  };
  const opportunity = await executeOpportunityCommand(actor, undefined, {
    action: "CREATE",
    operationKey: key(),
    fields,
  });
  async function quote(approved = true) {
    let q = await saveQuote(actor, undefined, {
      customerId: customer.id,
      items: [
        { lineId: key(), description: "Peça", quantity: 1, unitPrice: "50.00" },
      ],
      discount: "0.00",
      shipping: "0.00",
      paymentTerms: "Pix",
      validUntil: todaySaoPaulo(new Date()),
    });
    if (approved) {
      q = await transitionQuote(actor, q.id, q.version, "ISSUE");
      q = await transitionQuote(actor, q.id, q.version, "APPROVE");
    }
    return q;
  }
  return { actor, customer, fields, opportunity, quote };
}
