"use client";
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
    <div className="commerce-page request-page">
      <h1>Solicitações</h1>
      <p>Revise as seleções recebidas antes de preparar um orçamento.</p>
      <AdminForm
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
      <div className="request-inbox">
        {initial.items.map((item) => (
          <article key={item.id} className="request-inbox-item">
            <h2>
              <Link href={`/solicitacoes/${item.id}`}>{item.protocol}</Link>
            </h2>
            <p>{item.name}</p>
            <p>
              {requestStateLabels[item.state]} ·{" "}
              {new Date(item.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </p>
            <p>
              {item.lineCount} linha(s) · {item.consultCount} sob consulta ·
              Canal: {item.preferredChannel === "email" ? "E-mail" : "WhatsApp"}
            </p>
            <p>Responsável: {item.assigneeName ?? "Não atribuído"}</p>
          </article>
        ))}
      </div>
      {!initial.total && <p>Nenhuma solicitação encontrada.</p>}
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
          disabled={initial.page * 20 >= initial.total}
          onClick={() => router.push(url(initial.page + 1))}
        >
          Próxima
        </Button>
      </Pagination>
    </div>
  );
}
