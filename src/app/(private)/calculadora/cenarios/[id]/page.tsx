import { notFound } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { getPricingComparison } from "@/server/pricing/comparisons/read";
import { getPricingCatalog } from "@/server/pricing/catalog";
import { ComparisonDetail } from "@/components/pricing/comparisons/comparison-detail";
import { AppError } from "@/lib/errors";
export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor(),
    { id } = await params;
  const [comparison, catalog] = await Promise.all([
    getPricingComparison(actor, id),
    getPricingCatalog(actor),
  ]).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  return <ComparisonDetail comparison={comparison} catalog={catalog} />;
}
