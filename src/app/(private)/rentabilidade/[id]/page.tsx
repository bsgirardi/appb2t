import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import { getSaleProfitability } from "@/server/profitability/queries";
import { listAssessments } from "@/server/profitability/assessments";
import { db } from "@/lib/db";
import { ProfitabilityDetail } from "@/components/profitability/detail";
import { ProfitabilityWorkspace } from "@/components/profitability/workspace";
export default async function ProfitabilitySalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  await requireProfitabilityAdmin(actor);
  const { id } = await params;
  const [value, assessments, channels] = await Promise.all([
    getSaleProfitability(actor, id),
    listAssessments(actor, id),
    db.pricingChannel.findMany({
      select: { id: true, name: true, version: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Link href="/rentabilidade">Voltar à rentabilidade</Link>
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
