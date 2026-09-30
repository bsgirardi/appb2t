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
  const [initial, options] = await Promise.all([
    getQuote(actor, id),
    commerceOptions(actor),
  ]);
  return (
    <QuoteDetail
      key={`${initial.id}:${initial.version}`}
      initial={initial}
      {...options}
    />
  );
}
