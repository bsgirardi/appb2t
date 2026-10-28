import { opportunityForQuote } from "@/server/opportunities/queries";
import { OpportunityQuoteLink } from "@/components/opportunities/quote-link";
import { db } from "@/lib/db";
import { CheckoutTeamPanel } from "@/components/checkout/checkout-team-panel";
import { requireActor } from "@/server/auth/guards";
import { getQuote } from "@/server/quotes";
import { commerceOptions } from "@/server/commerce/options";
import { QuoteDetail } from "@/components/commerce/quote-detail";
export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const [initial, options, opportunity] = await Promise.all([
    getQuote(actor, id),
    commerceOptions(actor),
    opportunityForQuote(actor, id),
  ]);
  const checkout = await db.checkout.findFirst({
    where: { OR: [{ quoteId: id }, { request: { quoteId: id } }] },
    select: { id: true },
  });
  return (
    <>
      <OpportunityQuoteLink key={opportunity?.id ?? "unlinked"} quoteId={id} customerId={initial.input.customerId ?? null} opportunity={opportunity} />
      <QuoteDetail
        key={`${initial.id}:${initial.version}`}
        initial={initial}
        {...options}
      />
      {checkout && <CheckoutTeamPanel checkoutId={checkout.id} />}
    </>
  );
}
