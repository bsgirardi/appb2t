import { requireActor } from "@/server/auth/guards";
import { listQuotes, quoteFilterSchema } from "@/server/quotes";
import { commerceOptions } from "@/server/commerce/options";
import { QuotePanel } from "@/components/commerce/quote-panel";
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v !== ""),
  );
  const parsed = quoteFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : quoteFilterSchema.parse({});
  const [initial, options] = await Promise.all([
    listQuotes(actor, filters),
    commerceOptions(actor),
  ]);
  return <QuotePanel initial={initial} filters={filters} {...options} />;
}
