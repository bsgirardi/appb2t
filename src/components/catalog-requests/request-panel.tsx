"use client";
import { FilterPanel } from "@/components/admin/filter-panel";
import { RelationshipCriteria } from "@/components/commerce/relationship-criteria";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { AdminForm } from "@/components/admin/admin-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Pagination } from "@/components/ui/pagination";
import type { Page } from "@/domain/shared/pagination";
import type { CatalogRequestSummaryDTO } from "@/domain/catalog-requests/types";
export const requestStateLabels = {
  RECEBIDA: "Recebida",
  EM_ATENDIMENTO: "Em atendimento",
  ORCAMENTO_PREPARADO: "Orçamento preparado",
  ENCERRADA: "Encerrada",
};
export function RequestPanel({
  initial,
  filters,
}: {
  initial: Page<CatalogRequestSummaryDTO>;
  filters: { search: string; state: string };
}) {
  const router = useRouter();
  const url = (page: number) =>
    `/solicitacoes?${new URLSearchParams({ ...filters, page: String(page) })}`;
  return (
    <div className="commerce-page request-page relationship-reading">
      <div className="page-heading">
        <div>
          <h1>Solicitações</h1>
          <p>Revise as seleções recebidas antes de preparar um orçamento.</p>
        </div>
      </div>
      <FilterPanel
        activeCount={
          Object.values(filters).filter((v) => v && v !== "all").length
        }
      >
        <AdminForm
          key={JSON.stringify(filters)}
          requiredGuide={false}
          className="commerce-filters"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(
              `/solicitacoes?${new URLSearchParams(new FormData(e.currentTarget) as never)}`,
            );
          }}
        >
          <Field
            label="Buscar por protocolo ou nome"
            name="search"
            defaultValue={filters.search}
            maxLength={160}
          />
          <Label>
            Estado
            <NativeSelect name="state" defaultValue={filters.state}>
              <option value="all">Todos</option>
              {Object.entries(requestStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Button type="submit">Filtrar</Button>
        </AdminForm>
      </FilterPanel>
      <RelationshipCriteria
        criteria={[
          ...(filters.search ? [`Busca: ${filters.search}`] : []),
          ...(filters.state !== "all" && filters.state
            ? [
                `Estado: ${requestStateLabels[filters.state as keyof typeof requestStateLabels] ?? "Selecionado"}`,
              ]
            : []),
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status">{initial.total} solicitações nesta seleção</p>
        {(filters.search || filters.state !== "all") && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/solicitacoes")}
          >
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="request-inbox">
        {initial.items.map((item) => (
          <article key={item.id} className="request-inbox-item">
            <h2>
              <Link
                className="relationship-link"
                href={`/solicitacoes/${item.id}?${new URLSearchParams({ returnTo: url(initial.page) })}`}
              >
                {item.protocol}
              </Link>
            </h2>
            <p>{item.name}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{requestStateLabels[item.state]}</Badge>
            </div>
            <p>
              Recebida em{" "}
              {new Date(item.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </p>
            <p>
              {item.lineCount} linha(s) · {item.consultCount} sob consulta ·
              Canal: {item.preferredChannel === "email" ? "E-mail" : "WhatsApp"}
            </p>
            <p>Responsável: {item.assigneeName ?? "Não atribuído"}</p>
            {item.quoteId ? (
              <Button asChild variant="outline">
                <Link href={`/orcamentos/${item.quoteId}`}>
                  Abrir orçamento vinculado
                </Link>
              </Button>
            ) : (
              <p>Sem orçamento vinculado.</p>
            )}
          </article>
        ))}
      </div>
      {!initial.items.length && (
        <Empty role="status">
          <EmptyHeader>
            <EmptyTitle>
              {initial.total > 0
                ? "Nenhuma solicitação nesta página"
                : "Nenhuma solicitação nesta seleção"}
            </EmptyTitle>
            <EmptyDescription>
              {initial.total > 0
                ? "Os resultados mudaram. Volte à primeira página para continuar."
                : filters.search || filters.state !== "all"
                  ? "Ajuste a busca ou o estado para encontrar outras solicitações."
                  : "As seleções recebidas pelo catálogo aparecerão aqui para atendimento."}
            </EmptyDescription>
          </EmptyHeader>
          {initial.total > 0 && (
            <EmptyContent>
              <Button variant="outline" onClick={() => router.push(url(1))}>
                Voltar à primeira página
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
      <Pagination className="form-actions">
        <Button
          type="button"
          variant="outline"
          disabled={initial.page <= 1}
          onClick={() => router.push(url(initial.page - 1))}
        >
          Anterior
        </Button>
        <span>
          {initial.total} solicitação(ões) · Página {initial.page}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={initial.page * initial.pageSize >= initial.total}
          onClick={() => router.push(url(initial.page + 1))}
        >
          Próxima
        </Button>
      </Pagination>
    </div>
  );
}
