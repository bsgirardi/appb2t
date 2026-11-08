import { requireActor } from "@/server/auth/guards";
import {
  getOpportunity,
  listOpportunityEvents,
  opportunityOptions,
} from "@/server/opportunities/queries";
import { OpportunityDetail } from "@/components/opportunities/detail";
export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const actor = await requireActor(),
    { id } = await params;
  const { returnTo } = await searchParams;
  const [initial, initialEvents, options] = await Promise.all([
    getOpportunity(actor, id),
    listOpportunityEvents(actor, id),
    opportunityOptions(actor),
  ]);
  return (
    <OpportunityDetail
      key={`${initial.id}:${initial.version}`}
      initial={initial}
      initialEvents={initialEvents}
      options={options}
      returnTo={typeof returnTo === "string" ? returnTo : undefined}
    />
  );
}
