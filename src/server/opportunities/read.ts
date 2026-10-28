import type { Prisma } from "@prisma/client";
import type { OpportunityDTO } from "@/domain/opportunities/types";
import { civilDateFromDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { effectiveQuoteStatus } from "@/domain/commerce/states";
import { AppError } from "@/lib/errors";
export const opportunityInclude = {
  customer: { select: { id: true, name: true, active: true } },
  owner: { select: { id: true, name: true, active: true } },
  quotes: {
    select: {
      id: true,
      sequence: true,
      version: true,
      status: true,
      validUntil: true,
    },
    orderBy: { sequence: "desc" as const },
  },
  wonSale: { select: { id: true, sequence: true, status: true } },
} satisfies Prisma.OpportunityInclude;
export type OpportunityRow = Prisma.OpportunityGetPayload<{
  include: typeof opportunityInclude;
}>;
export function opportunityDTO(row: OpportunityRow): OpportunityDTO {
  return {
    id: row.id,
    title: row.title,
    customerId: row.customerId,
    ownerId: row.ownerId,
    stage: row.stage,
    nextAction: row.nextAction,
    nextContactDate: row.nextContactDate
      ? civilDateFromDb(row.nextContactDate)
      : null,
    pendingNotes: row.pendingNotes,
    lossReason: row.lossReason,
    version: row.version,
    customer: row.customer,
    owner: row.owner,
    principalQuoteId: row.principalQuoteId,
    quotes: row.quotes.map((q) => ({
      id: q.id,
      number: `ORC-${String(q.sequence).padStart(6, "0")}`,
      version: q.version,
      status: effectiveQuoteStatus(
        q.status,
        q.validUntil ? civilDateFromDb(q.validUntil) : "9999-12-31",
        todaySaoPaulo(new Date()),
      ),
    })),
    wonSale: row.wonSale
      ? {
          id: row.wonSale.id,
          number: `VEN-${String(row.wonSale.sequence).padStart(6, "0")}`,
          status: row.wonSale.status,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function readOpportunity(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const row = await tx.opportunity.findUnique({
    where: { id },
    include: opportunityInclude,
  });
  if (!row) throw new AppError("NOT_FOUND", "Oportunidade não encontrada.");
  return opportunityDTO(row);
}
