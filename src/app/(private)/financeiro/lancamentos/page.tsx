import { requireAdmin } from "@/server/auth/guards";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { listEntries, getEntry } from "@/server/finance/entries";
import { AppError } from "@/lib/errors";
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
    raw = await searchParams;
  const selectedEntryId =
    typeof raw.entryId === "string" && raw.entryId.length <= 100
      ? raw.entryId
      : undefined;
  const { entryId: _entryId, ...filterRaw } = raw;
  void _entryId;
  const { query, filter, invalid } = financePageQuery(filterRaw);
  const [accounts, categories, result, initialDetail] = await Promise.all([
    listAccounts(actor),
    listCategories(actor),
    listEntries(actor, filter),
    selectedEntryId
      ? getEntry(actor, selectedEntryId).catch((e) => {
          if (e instanceof AppError && e.code === "NOT_FOUND") return null;
          throw e;
        })
      : Promise.resolve(null),
  ]);
  return (
    <>
      {invalid && (
        <Notice>Filtros inválidos. Exibindo todos os registros.</Notice>
      )}
      {selectedEntryId && !initialDetail && (
        <Notice>Lançamento solicitado não encontrado.</Notice>
      )}
      <FinanceFilters
        action="/financeiro/lancamentos"
        query={query}
        accounts={accounts}
        categories={categories}
        entries
      />
      <EntryPanel
        key={selectedEntryId ?? "list"}
        initialDetail={initialDetail}
        result={result}
        accounts={accounts}
        categories={categories}
        query={query}
      />
    </>
  );
}
