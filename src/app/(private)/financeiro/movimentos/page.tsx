import { requireAdmin } from "@/server/auth/guards";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { listMovements } from "@/server/finance/reports";
import { financePageQuery } from "@/server/finance/page-query";
import { FinanceFilters } from "@/components/finance/filters";
import { MovementPanel } from "@/components/finance/movement-panel";
import { Notice } from "@/components/ui/field";
export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin(),
    { query, filter, invalid } = financePageQuery(await searchParams);
  const [accounts, categories, result] = await Promise.all([
    listAccounts(actor),
    listCategories(actor),
    listMovements(actor, filter),
  ]);
  return (
    <>
      {invalid && (
        <Notice>Filtros inválidos. Exibindo todos os registros.</Notice>
      )}
      <FinanceFilters
        action="/financeiro/movimentos"
        query={query}
        accounts={accounts}
        categories={categories}
      />
      <MovementPanel result={result} accounts={accounts} query={query} />
    </>
  );
}
