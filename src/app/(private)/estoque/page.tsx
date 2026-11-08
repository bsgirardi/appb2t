import { OperationResults } from "@/components/admin/operation-results";
import { OperationListContext } from "@/components/admin/operation-list-context";
import { FilterPanel } from "@/components/admin/filter-panel";
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
  const receiptId =
    typeof query.receiptId === "string" ? query.receiptId : undefined;
  const clearHref = `/estoque?${new URLSearchParams({ view, ...(saleId ? { saleId } : {}) })}`;
  const href = (page: number) =>
    `/estoque?${new URLSearchParams({ view, query: filter.query, page: String(page), ...(saleId ? { saleId } : {}), ...(receiptId ? { receiptId } : {}) })}`;
  return (
    <section className="operation-composition flex min-w-0 flex-col gap-5">
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
          <Link
            href={`/producao?${new URLSearchParams({ view: "finished", ...(saleId ? { saleId } : {}) })}`}
          >
            Peças prontas
          </Link>
        </Button>
        {[
          ["items", "Materiais"],
          ["receipts", "Recebimentos"],
          ["reservations", "Reservas"],
          ["shortage", "Reposição"],
        ].map(([v, label]) => (
          <Button key={v} asChild variant={view === v ? "default" : "outline"}>
            <Link
              aria-current={view === v ? "page" : undefined}
              href={`/estoque?${new URLSearchParams({ view: v, ...(saleId ? { saleId } : {}) })}`}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {!parsed.success && (
        <Notice>Filtros inválidos. Exibindo a primeira página.</Notice>
      )}
      <FilterPanel
        activeCount={(filter.query ? 1 : 0) + (receiptId ? 1 : 0)}
        hasErrors={!parsed.success}
      >
        <form method="get" action="/estoque" className="admin-filter-grid">
          <input type="hidden" name="view" value={view} />
          {receiptId && (
            <input type="hidden" name="receiptId" value={receiptId} />
          )}
          {saleId && <input type="hidden" name="saleId" value={saleId} />}
          <Field
            label={view === "receipts" ? "Buscar fornecedor" : "Buscar item"}
            name="query"
            defaultValue={filter.query}
          />
          <Button>Aplicar filtros</Button>
          {(filter.query || receiptId) && (
            <Button asChild variant="outline">
              <Link href={clearHref}>Limpar filtros</Link>
            </Button>
          )}
        </form>
      </FilterPanel>
      <OperationListContext
        title={
          view === "receipts"
            ? "Recebimentos de compra"
            : view === "reservations"
              ? "Reservas de materiais"
              : view === "shortage"
                ? "Materiais para reposição"
                : "Materiais"
        }
        total={total}
        criteria={[
          !!filter.query && `Busca: ${filter.query}`,
          filter.negative && "Disponível negativo",
          view === "receipts" && !!receiptId && "Recebimento selecionado",
          view === "reservations" && !!saleId && "Venda selecionada",
        ]}
      />
      <StockPanel
        key={`${view}:${saleId ?? ""}:${typeof query.itemId === "string" ? query.itemId : ""}`}
        admin={actor.role === "ADMIN"}
        items={stock.items}
        receipts={receipts.items}
        reservations={reservations.items}
        options={options}
        categories={categories}
        view={view}
        initialDetail={detail}
      />
      <OperationResults
        total={total}
        page={filter.page}
        pageSize={filter.pageSize}
        filtered={!!(filter.query || receiptId)}
        href={href}
        clearHref={clearHref}
      />
    </section>
  );
}
