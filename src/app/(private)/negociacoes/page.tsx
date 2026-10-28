import { requireActor } from "@/server/auth/guards";
import {
  listOpportunities,
  opportunityOptions,
} from "@/server/opportunities/queries";
import { opportunityFilterSchema } from "@/domain/opportunities/validation";
import { OpportunityPanel } from "@/components/opportunities/panel";
export default async function NegotiationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v !== ""),
  );
  const parsed = opportunityFilterSchema.safeParse(raw),
    filters = parsed.success ? parsed.data : opportunityFilterSchema.parse({});
  const [initial, options] = await Promise.all([
    listOpportunities(actor, filters),
    opportunityOptions(actor),
  ]);
  return (
    <OpportunityPanel
      initial={initial}
      filters={filters}
      options={options}
      actorId={actor.id}
    />
  );
}
