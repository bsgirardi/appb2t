import { requireAdmin } from "@/server/auth/guards";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { listEntries } from "@/server/finance/entries";
import { financePageQuery } from "@/server/finance/page-query";
import { FinanceFilters } from "@/components/finance/filters";
import { EntryPanel } from "@/components/finance/entry-panel";
import { Notice } from "@/components/ui/field";
export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin(),
    { query, filter, invalid } = financePageQuery(await searchParams);
  const [accounts, categories, result] = await Promise.all([
    listAccounts(actor),
    listCategories(actor),
    listEntries(actor, filter),
  ]);
  return (
    <>
      {invalid && (
        <Notice>Filtros inválidos. Exibindo todos os registros.</Notice>
      )}
      <FinanceFilters
        action="/financeiro/lancamentos"
        query={query}
        accounts={accounts}
        categories={categories}
        entries
      />
      <EntryPanel
        result={result}
        accounts={accounts}
        categories={categories}
        query={query}
      />
    </>
  );
}
