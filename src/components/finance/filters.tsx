import type { AccountDTO, CategoryDTO } from "@/domain/finance/types";
export function FinanceFilters({
  action,
  query,
  accounts,
  categories,
  entries = false,
}: {
  action: string;
  query: Record<string, string>;
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  entries?: boolean;
}) {
  return (
    <form action={action} className="card commerce-form">
      <div className="form-grid">
        <label className="field">
          Buscar
          <input name="search" defaultValue={query.search} maxLength={160} />
        </label>
        <label className="field">
          De
          <input name="dateFrom" type="date" defaultValue={query.dateFrom} />
        </label>
        <label className="field">
          Até
          <input name="dateTo" type="date" defaultValue={query.dateTo} />
        </label>
        <label className="field">
          Conta
          <select name="accountId" defaultValue={query.accountId}>
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {!a.active ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Categoria
          <select name="categoryId" defaultValue={query.categoryId}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Tipo
          <select name="kind" defaultValue={query.kind}>
            <option value="">Todos</option>
            <option value="RECEIVABLE">Receitas / recebíveis</option>
            <option value="PAYABLE">Despesas / pagáveis</option>
          </select>
        </label>
        {entries && (
          <>
            <label className="field">
              Situação
              <select name="state" defaultValue={query.state}>
                <option value="">Todas</option>
                {["ABERTO", "PARCIAL", "LIQUIDADO", "CANCELADO"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Vencimento
              <select name="overdue" defaultValue={query.overdue}>
                <option value="">Todos</option>
                <option value="true">Vencidos em aberto</option>
                <option value="false">Demais</option>
              </select>
            </label>
          </>
        )}
      </div>
      {query.saleId && (
        <input type="hidden" name="saleId" value={query.saleId} />
      )}
      <div className="finance-actions">
        <button className="button secondary">Aplicar filtros</button>
        <a className="button secondary" href={action}>
          Limpar
        </a>
      </div>
      <small>
        Datas filtram vencimentos nos lançamentos e datas efetivas nos
        movimentos. Por conta, previsões incluem obrigações que já tiveram baixa
        nessa conta.
      </small>
    </form>
  );
}
