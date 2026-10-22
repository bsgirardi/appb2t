import Link from "next/link";
import { requireActor } from "@/server/auth/guards";
import {
  listStock,
  listReceipts,
  listReservations,
  stockOptions,
  getStock,
} from "@/server/stock/queries";
import { listCategories } from "@/server/finance/categories";
import { StockPanel } from "@/components/stock/stock-panel";
import { stockFilterSchema } from "@/domain/stock/validation";
import { Notice, Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor(),
    query = await searchParams;
  const view =
    typeof query.view === "string" &&
    ["items", "receipts", "reservations", "shortage"].includes(query.view)
      ? query.view
      : "items";
  const parsed = stockFilterSchema.safeParse({
    query: typeof query.query === "string" ? query.query : "",
    page: query.page ?? 1,
    negative: view === "shortage",
  });
  const filter = parsed.success ? parsed.data : stockFilterSchema.parse({});
  const saleId = typeof query.saleId === "string" ? query.saleId : undefined;
  const [stock, receipts, reservations, options, categories, detail] =
    await Promise.all([
      listStock(
        actor,
        view === "items" || view === "shortage" ? filter : { pageSize: 100 },
      ),
      view === "receipts"
        ? listReceipts(actor, {
            ...filter,
            receiptId:
              typeof query.receiptId === "string" ? query.receiptId : undefined,
          })
        : Promise.resolve({ items: [], total: 0 }),
      view === "reservations"
        ? listReservations(actor, { ...filter, saleId })
        : Promise.resolve({ items: [], total: 0 }),
      stockOptions(actor),
      actor.role === "ADMIN" ? listCategories(actor) : Promise.resolve([]),
      typeof query.itemId === "string"
        ? getStock(actor, query.itemId)
        : Promise.resolve(null),
    ]);
  const total =
    view === "receipts"
      ? receipts.total
      : view === "reservations"
        ? reservations.total
        : stock.total;
  const href = (page: number) =>
    `/estoque?${new URLSearchParams({ view, query: filter.query, page: String(page), ...(saleId ? { saleId } : {}) })}`;
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="page-heading">
        <div>
          <h1>Estoque</h1>
          <p>
            Materiais disponíveis, reservas da produção e recebimentos de
            compra.
          </p>
        </div>
      </div>
      <nav aria-label="Visões de estoque" className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/producao?view=finished">Peças prontas</Link>
        </Button>
        {[
          ["items", "Materiais"],
          ["receipts", "Recebimentos"],
          ["reservations", "Reservas"],
          ["shortage", "Reposição"],
        ].map(([v, label]) => (
          <Button key={v} asChild variant={view === v ? "default" : "outline"}>
            <Link href={`/estoque?view=${v}`}>{label}</Link>
          </Button>
        ))}
      </nav>
      {!parsed.success && (
        <Notice>Filtros inválidos. Exibindo a primeira página.</Notice>
      )}
      <form className="admin-filter-grid">
        <input type="hidden" name="view" value={view} />
        {saleId && <input type="hidden" name="saleId" value={saleId} />}
        <Field
          label={view === "receipts" ? "Buscar fornecedor" : "Buscar item"}
          name="query"
          defaultValue={filter.query}
        />
        <Button>Filtrar</Button>
      </form>
      <StockPanel
        admin={actor.role === "ADMIN"}
        items={stock.items}
        receipts={receipts.items}
        reservations={reservations.items}
        options={options}
        categories={categories}
        view={view}
        initialDetail={detail}
      />
      {total === 0 && (
        <p className="rounded border p-5 text-muted-foreground">
          Nenhum registro nesta visão.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p>
          {total} registros · página {filter.page}
        </p>
        {filter.page > 1 && (
          <Link href={href(filter.page - 1)} className="underline">
            Anterior
          </Link>
        )}
        {filter.page * filter.pageSize < total && (
          <Link href={href(filter.page + 1)} className="underline">
            Próxima
          </Link>
        )}
      </div>
    </section>
  );
}
