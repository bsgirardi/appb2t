import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import { getSaleProfitability } from "@/server/profitability/queries";
import { listAssessments } from "@/server/profitability/assessments";
import { db } from "@/lib/db";
import { ProfitabilityDetail } from "@/components/profitability/detail";
import { ProfitabilityWorkspace } from "@/components/profitability/workspace";
import { profitabilityReturnHref } from "@/components/profitability/navigation";
export default async function ProfitabilitySalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin();
  await requireProfitabilityAdmin(actor);
  const { id } = await params;
  const returnHref = profitabilityReturnHref((await searchParams).returnTo);
  const [value, assessments, channels] = await Promise.all([
    getSaleProfitability(actor, id),
    listAssessments(actor, id),
    db.pricingChannel.findMany({
      select: { id: true, name: true, version: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <section className="profitability-reading flex min-w-0 flex-col gap-4">
      <Link href={returnHref}>Voltar à rentabilidade</Link>
      <h1>Rentabilidade do pedido {value.number}</h1>
      <ProfitabilityDetail value={value} />
      <ProfitabilityWorkspace
        value={value}
        actorId={actor.id}
        channels={channels}
        assessments={assessments}
      />
    </section>
  );
}
