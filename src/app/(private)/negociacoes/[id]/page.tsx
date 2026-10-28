import { requireActor } from "@/server/auth/guards";
import {
  getOpportunity,
  listOpportunityEvents,
  opportunityOptions,
} from "@/server/opportunities/queries";
import { OpportunityDetail } from "@/components/opportunities/detail";
export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor(),
    { id } = await params;
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
    />
  );
}
