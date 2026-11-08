"use client";
import { FilterPanel } from "@/components/admin/filter-panel";
import { AdminForm } from "@/components/admin/admin-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { AccountDTO, CategoryDTO } from "@/domain/finance/types";
import { Badge } from "@/components/ui/badge";
import { dateLabel } from "./shared";
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
  const movements = action === "/financeiro/movimentos";
  const dateMeaning = entries
    ? "Vencimento"
    : movements
      ? "Data efetiva"
      : "Período";
  const labels: Record<string, string> = {
    search: "Busca",
    dateFrom: `${dateMeaning} a partir de`,
    dateTo: `${dateMeaning} até`,
    accountId: "Conta",
    categoryId: "Categoria",
    kind: "Tipo",
    state: "Situação",
    overdue: "Vencimento",
    saleId: "Venda de origem",
    groupId: "Grupo de títulos",
    counterparty: "Contraparte",
  };
  const criteria = Object.entries(query).filter(
    ([key, value]) => value && labels[key],
  );
  function valueLabel(key: string, value: string) {
    if (key === "dateFrom" || key === "dateTo") return dateLabel(value);
    if (key === "accountId")
      return accounts.find((a) => a.id === value)?.name ?? "Conta selecionada";
    if (key === "categoryId")
      return (
        categories.find((c) => c.id === value)?.name ?? "Categoria selecionada"
      );
    if (key === "kind") return value === "RECEIVABLE" ? "A receber" : "A pagar";
    if (key === "overdue")
      return value === "true" ? "Vencidos em aberto" : "Demais";
    return value;
  }
  return (
    <div className="finance-reading">
      <section
        aria-label="Critérios financeiros aplicados"
        className="finance-criteria"
      >
        <h2>Critérios aplicados</h2>
        <p>
          {query.dateFrom || query.dateTo
            ? "Período delimitado pelos critérios abaixo."
            : "Sem limite de período informado."}{" "}
          Valores em reais (R$).
        </p>
        {criteria.length > 0 ? (
          <ul>
            {criteria.map(([key, value]) => (
              <li key={key}>
                <Badge variant="outline">
                  {labels[key]}: {valueLabel(key, value)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p>Todas as contas e categorias, sem filtros adicionais.</p>
        )}
        {!entries && !movements && (
          <p>
            Datas filtram vencimentos dos títulos e datas efetivas dos
            movimentos. O saldo atual considera somente a seleção de conta; a
            projeção incorpora vencidos e datas intermediárias anteriores ao
            início do período.
          </p>
        )}
      </section>
      <FilterPanel activeCount={criteria.length}>
        <Card asChild>
          <AdminForm
            action={action}
            method="get"
            requiredGuide={false}
            className="commerce-form"
          >
            <div className="form-grid">
              <Label className="field">
                Buscar
                <Input
                  name="search"
                  defaultValue={query.search}
                  maxLength={160}
                />
              </Label>
              <Label className="field">
                {dateMeaning} a partir de
                <Input
                  name="dateFrom"
                  type="date"
                  defaultValue={query.dateFrom}
                />
              </Label>
              <Label className="field">
                {dateMeaning} até
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
                      {["ABERTO", "PARCIAL", "LIQUIDADO", "CANCELADO"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
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
            {[
              "saleId",
              "groupId",
              "counterparty",
              "pageSize",
              ...(!entries ? ["state", "overdue"] : []),
            ].map((name) =>
              query[name] ? (
                <input
                  key={name}
                  type="hidden"
                  name={name}
                  value={query[name]}
                />
              ) : null,
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
      </FilterPanel>
    </div>
  );
}
