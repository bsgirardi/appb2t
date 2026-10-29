import { requireActor } from "@/server/auth/guards";
import { listPricingComparisons } from "@/server/pricing/comparisons/read";
import { ComparisonLibrary } from "@/components/pricing/comparisons/comparison-library";
export default async function ComparisonsPage() {
  const actor = await requireActor();
  return <ComparisonLibrary initial={await listPricingComparisons(actor, {})} />;
}
