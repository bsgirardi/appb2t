import type { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import { isOpportunityOpen } from "@/domain/opportunities/states";
import type { Actor } from "@/server/auth/session";
import type { CommerceAuthor } from "@/server/commerce/sale-write";
import { opportunityEvent } from "./audit";
// All callers hold lockPlanning through commit, including checkout callers
// that already hold their session/quote locks before reaching this helper.
export async function assertOpportunityQuoteOpen(
  tx: Prisma.TransactionClient,
  quoteId: string,
) {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { opportunity: { select: { stage: true } } },
  });
  if (quote?.opportunity && !isOpportunityOpen(quote.opportunity.stage))
    throw new AppError(
      "CONFLICT",
      "A oportunidade está encerrada. Revise a negociação antes de continuar.",
    );
}
export async function assertOpportunityQuoteCustomer(
  tx: Prisma.TransactionClient,
  quoteId: string,
  customerId: string | null,
) {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { opportunity: { select: { customerId: true } } },
  });
  if (quote?.opportunity && quote.opportunity.customerId !== customerId)
    throw new AppError(
      "CONFLICT",
      "O cliente do orçamento precisa corresponder à oportunidade vinculada.",
    );
}
export async function assertNoActiveOpportunityOffers(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const quotes = await tx.quote.findMany({
    where: { opportunityId: id },
    select: { id: true },
  });
  const quoteIds = quotes.map((q) => q.id);
  if (!quoteIds.length) return;
  const active = await tx.checkoutOffer.findFirst({
    where: {
      active: true,
      checkout: {
        OR: [
          { quoteId: { in: quoteIds } },
          { request: { quoteId: { in: quoteIds } } },
        ],
      },
    },
  });
  if (active)
    throw new AppError(
      "CONFLICT",
      "Retire a oferta privada ativa pelo atendimento antes de registrar a perda.",
    );
}
export async function recordOpportunityWon(
  tx: Prisma.TransactionClient,
  author: CommerceAuthor,
  quoteId: string,
  saleId: string,
  source: "CONVERSION" | "LINK",
) {
  const q = await tx.quote.findUniqueOrThrow({
    where: { id: quoteId },
    select: { opportunityId: true },
  });
  if (!q.opportunityId) return;
  const id = q.opportunityId;
  await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${id} FOR UPDATE`;
  const o = await tx.opportunity.findUniqueOrThrow({ where: { id } });
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  if (
    !isOpportunityOpen(o.stage) ||
    o.wonSaleId ||
    sale.quoteId !== quoteId ||
    sale.customerId !== o.customerId ||
    sale.status === "CANCELADA"
  )
    throw new AppError(
      "CONFLICT",
      "Revise a oportunidade e sua venda vencedora.",
    );
  await tx.opportunity.update({
    where: { id },
    data: {
      stage: "GANHO",
      wonSaleId: saleId,
      nextAction: null,
      nextContactDate: null,
      ...(source === "CONVERSION" ? { version: { increment: 1 } } : {}),
    },
  });
  if (source === "CONVERSION")
    await opportunityEvent(tx, author, id, "WON", {
      quoteId,
      saleId,
      before: {
        stage: o.stage,
        nextAction: o.nextAction,
        nextContactDate: o.nextContactDate?.toISOString().slice(0, 10) ?? null,
      },
      after: { stage: "GANHO", nextAction: null, nextContactDate: null },
    });
}
export async function linkOpportunityQuote(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  quoteId: string,
) {
  const o = await tx.opportunity.findUniqueOrThrow({ where: { id } });
  const q = await tx.quote.findUnique({
    where: { id: quoteId },
    include: { sale: true },
  });
  if (!q) throw new AppError("NOT_FOUND", "Orçamento não encontrado.");
  if (
    !isOpportunityOpen(o.stage) ||
    q.opportunityId ||
    q.customerId !== o.customerId
  )
    throw new AppError(
      "CONFLICT",
      "Selecione um orçamento do mesmo cliente ainda sem oportunidade.",
    );
  if (
    q.sale &&
    (q.sale.status === "CANCELADA" || q.sale.customerId !== o.customerId)
  )
    throw new AppError(
      "CONFLICT",
      "A venda existente está cancelada ou possui outro cliente.",
    );
  if (q.status === "CONVERTIDO" && !q.sale) throw conflict();
  await tx.quote.update({
    where: { id: quoteId },
    data: { opportunityId: id },
  });
  if (!o.principalQuoteId)
    await tx.opportunity.update({
      where: { id },
      data: { principalQuoteId: quoteId },
    });
  if (q.sale)
    await recordOpportunityWon(
      tx,
      { kind: "ADMIN", actor },
      quoteId,
      q.sale.id,
      "LINK",
    );
}
