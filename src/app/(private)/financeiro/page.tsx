import { requireAdmin } from "@/server/auth/guards";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { getFinanceDashboard, getCashFlow } from "@/server/finance/reports";
import { financePageQuery } from "@/server/finance/page-query";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { FinanceFilters } from "@/components/finance/filters";
import { CashFlow } from "@/components/finance/cash-flow";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { Notice } from "@/components/ui/field";
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin(),
    { query, filter, invalid } = financePageQuery(await searchParams);
  const [accounts, categories, dashboard, flow] = await Promise.all([
    listAccounts(actor),
    listCategories(actor),
    getFinanceDashboard(actor, filter),
    getCashFlow(actor, filter),
  ]);
  return (
    <>
      {invalid && (
        <Notice>Filtros inválidos. Exibindo todos os registros.</Notice>
      )}
      <FinanceDashboard data={dashboard} today={todaySaoPaulo(new Date())} />
      <FinanceFilters
        action="/financeiro"
        query={query}
        accounts={accounts}
        categories={categories}
      />
      <CashFlow {...flow} />
    </>
  );
}
