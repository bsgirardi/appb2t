import { AdminForm } from "@/components/admin/admin-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
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
    <Card asChild>
      <AdminForm action={action} className="commerce-form">
        <div className="form-grid">
          <Label className="field">
            Buscar
            <Input name="search" defaultValue={query.search} maxLength={160} />
          </Label>
          <Label className="field">
            De
            <Input name="dateFrom" type="date" defaultValue={query.dateFrom} />
          </Label>
          <Label className="field">
            Até
            <Input name="dateTo" type="date" defaultValue={query.dateTo} />
          </Label>
          <Label className="field">
            Conta
            <NativeSelect name="accountId" defaultValue={query.accountId}>
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {!a.active ? " (inativa)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Label className="field">
            Categoria
            <NativeSelect name="categoryId" defaultValue={query.categoryId}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? " (inativa)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Label className="field">
            Tipo
            <NativeSelect name="kind" defaultValue={query.kind}>
              <option value="">Todos</option>
              <option value="RECEIVABLE">Receitas / recebíveis</option>
              <option value="PAYABLE">Despesas / pagáveis</option>
            </NativeSelect>
          </Label>
          {entries && (
            <>
              <Label className="field">
                Situação
                <NativeSelect name="state" defaultValue={query.state}>
                  <option value="">Todas</option>
                  {["ABERTO", "PARCIAL", "LIQUIDADO", "CANCELADO"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </NativeSelect>
              </Label>
              <Label className="field">
                Vencimento
                <NativeSelect name="overdue" defaultValue={query.overdue}>
                  <option value="">Todos</option>
                  <option value="true">Vencidos em aberto</option>
                  <option value="false">Demais</option>
                </NativeSelect>
              </Label>
            </>
          )}
        </div>
        {query.saleId && (
          <input type="hidden" name="saleId" value={query.saleId} />
        )}
        <div className="finance-actions">
          <Button variant="outline" size="sm" className="">
            Aplicar filtros
          </Button>
          <Button asChild variant="outline">
            <a href={action}>Limpar</a>
          </Button>
        </div>
        <small>
          Datas filtram vencimentos nos lançamentos e datas efetivas nos
          movimentos. Por conta, previsões incluem obrigações que já tiveram
          baixa nessa conta.
        </small>
      </AdminForm>
    </Card>
  );
}
