import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";
import { readMonthlyGoal } from "@/server/profitability/monthly-goals";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { monthlyQuerySchema } from "@/domain/profitability/monthly-goals";
import { MonthlyGoals } from "@/components/profitability/monthly-goals";
import { Notice } from "@/components/ui/field";
export default async function MonthlyGoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin();
  const raw = await searchParams;
  const parsed = monthlyQuerySchema.safeParse({
    month: raw.month ?? todaySaoPaulo(new Date()).slice(0, 7),
    page: raw.page ?? 1,
  });
  if (!parsed.success)
    return (
      <section>
        <h1>Metas mensais</h1>
        <Notice>Competência ou página inválida.</Notice>
        <Link href="/rentabilidade/metas">Consultar mês atual</Link>
      </section>
    );
  const data = await readMonthlyGoal(actor, parsed.data);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h1>Acompanhamento mensal</h1>
      <Link href="/rentabilidade">Voltar à Rentabilidade</Link>
      <MonthlyGoals key={`${data.month}:${data.history.page}`} initial={data} />
    </section>
  );
}
