import { FilterPanel } from "@/components/admin/filter-panel";
import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import { requireActor } from "@/server/auth/guards";
import {
  listOrders,
  listFinished,
  productionOptions,
  saleProduction,
  productionFilterSchema,
} from "@/server/production/queries";
import { ProductionPanel } from "@/components/production/production-panel";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor(),
    query = await searchParams;
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const view = value("view") === "finished" ? "finished" : "orders";
  const saleId = value("saleId");
  const parsed = productionFilterSchema.safeParse({
    query: value("query"),
    page: value("page"),
    status: value("status") || undefined,
    origin: value("origin") || undefined,
    responsibleId: value("responsibleId") || undefined,
    dueFrom: value("dueFrom") || undefined,
    dueTo: value("dueTo") || undefined,
    saleId,
  });
  const filter = parsed.success
    ? parsed.data
    : productionFilterSchema.parse({ saleId });
  const [orders, finished, options, sale] = await Promise.all([
    listOrders(actor, filter),
    listFinished(actor, view === "finished" ? filter : { saleId }),
    productionOptions(actor),
    saleId ? saleProduction(actor, saleId) : Promise.resolve(null),
  ]);
  const total = view === "finished" ? finished.total : orders.total;
  const href = (page: number) =>
    `/producao?${new URLSearchParams({ view, query: filter.query, page: String(page), ...(saleId ? { saleId } : {}), ...(filter.status ? { status: filter.status } : {}), ...(filter.origin ? { origin: filter.origin } : {}), ...(filter.responsibleId ? { responsibleId: filter.responsibleId } : {}), ...(filter.dueFrom ? { dueFrom: filter.dueFrom } : {}), ...(filter.dueTo ? { dueTo: filter.dueTo } : {}) })}`;
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="page-heading">
        <div>
          <h1>Produção e entrega</h1>
          <p>Ordens, peças boas registradas no estoque e entregas parciais.</p>
        </div>
      </div>
      <nav aria-label="Visões de produção" className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/planejamento">Planejamento das máquinas</Link>
        </Button>
        <Button asChild variant={view === "orders" ? "default" : "outline"}>
          <Link href="/producao">Ordens</Link>
        </Button>
        <Button asChild variant={view === "finished" ? "default" : "outline"}>
          <Link href="/producao?view=finished">Peças prontas</Link>
        </Button>
        {saleId && <Link href={`/vendas/${saleId}`}>Voltar à venda</Link>}
      </nav>
      {!parsed.success && (
        <Notice>Filtros inválidos. Exibindo a primeira página.</Notice>
      )}
      <FilterPanel
        activeCount={
          Object.entries(filter).filter(
            ([k, v]) => v && !["page", "pageSize", "saleId"].includes(k),
          ).length
        }
        hasErrors={!parsed.success}
      >
        <form className="admin-filter-grid">
          <input type="hidden" name="view" value={view} />
          {saleId && <input type="hidden" name="saleId" value={saleId} />}
          <Field label="Buscar item" name="query" defaultValue={filter.query} />
          {view === "orders" && (
            <>
              <label className="field">
                Responsável
                <NativeSelect
                  name="responsibleId"
                  defaultValue={filter.responsibleId ?? ""}
                >
                  <option value="">Todos</option>
                  {options.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Field
                label="Prazo a partir de"
                name="dueFrom"
                type="date"
                defaultValue={filter.dueFrom ?? ""}
              />
              <Field
                label="Prazo até"
                name="dueTo"
                type="date"
                defaultValue={filter.dueTo ?? ""}
              />
              <label className="field">
                Estado
                <NativeSelect name="status" defaultValue={filter.status ?? ""}>
                  <option value="">Todos</option>
                  {[
                    ["RASCUNHO", "Rascunho"],
                    ["LIBERADA", "Liberada"],
                    ["EM_EXECUCAO", "Em execução"],
                    ["CONCLUIDA", "Concluída"],
                    ["CANCELADA", "Cancelada"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="field">
                Destino
                <NativeSelect name="origin" defaultValue={filter.origin ?? ""}>
                  <option value="">Todos</option>
                  <option value="SALE">Venda</option>
                  <option value="STOCK">Estoque</option>
                </NativeSelect>
              </label>
            </>
          )}
          <Button>Filtrar</Button>
        </form>
      </FilterPanel>
      <ProductionPanel
        key={`${view}:${saleId ?? ""}`}
        orders={orders.items}
        finished={finished.items}
        options={options}
        admin={actor.role === "ADMIN"}
        sale={sale}
        view={view}
      />
      <div className="flex gap-3">
        <p>
          {total} registros · página {filter.page}
        </p>
        {filter.page > 1 && <Link href={href(filter.page - 1)}>Anterior</Link>}
        {filter.page * filter.pageSize < total && (
          <Link href={href(filter.page + 1)}>Próxima</Link>
        )}
      </div>
    </section>
  );
}
