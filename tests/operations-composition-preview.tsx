import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { ProductionPanel } from "@/components/production/production-panel";
import { StockPanel } from "@/components/stock/stock-panel";
import { OperationListContext } from "@/components/admin/operation-list-context";
import { OperationResults } from "@/components/admin/operation-results";
import { FilterPanel } from "@/components/admin/filter-panel";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  operationOrder,
  operationOptions,
  operationStock,
} from "./fixtures/operations";
import type { FinishedDetail, OrderDetail } from "@/server/production/queries";
import type {
  StockReservationDTO,
  StockReceiptDTO,
} from "@/server/stock/queries";
import "@/app/design.css";

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const view = params.get("view") ?? "orders";
const admin = !params.has("operator");
const longName =
  "Suporte personalizado para exposição de miniaturas e projetos especiais da associação de artesãos";
const orders: OrderDetail[] = [
  operationOrder,
  {
    ...operationOrder,
    id: "draft",
    sequence: 43,
    status: "RASCUNHO",
    lines: [
      {
        ...operationOrder.lines[0],
        description: longName,
        goodUnits: 0,
        failedUnits: 0,
      },
    ],
  },
];
const receipts: StockReceiptDTO[] = [
  {
    id: "receipt",
    supplier: "Fornecedor sintético de materiais para impressão e acabamento",
    document: "NF-000042",
    version: 1,
    status: "PENDING",
    effectiveDate: "2026-11-07",
    total: null,
    entryIds: [],
    pendingReturns: [],
    lines: [
      {
        id: "line",
        itemId: operationStock.id,
        name: longName,
        unit: "G",
        quantity: "1200",
        confirmedValue: null,
      },
    ],
  },
];
const reservations: StockReservationDTO[] = [
  {
    id: "reservation",
    itemId: operationStock.id,
    saleId: "synthetic-sale",
    saleNumber: "VEN-000042",
    saleStatus: "CONFIRMADA",
    lineKey: "line",
    name: longName,
    unit: "G",
    version: 1,
    reserved: "1100",
    remaining: "800",
    consumed: "200",
    released: "100",
  },
];
const finished: FinishedDetail[] = [
  {
    id: "finished",
    productId: "product",
    ownerSaleId: null,
    lineKey: null,
    name: longName,
    active: true,
    inventoriedAt: "2026-11-01",
    version: 1,
    physical: "20",
    reserved: "8",
    available: "12",
    origins: [
      {
        id: "origin",
        kind: "PRODUCTION",
        restrictedSaleId: null,
        lineId: "line",
        physical: "20",
        reserved: "8",
        available: "12",
      },
    ],
  },
  {
    id: "unknown",
    productId: "unknown",
    ownerSaleId: null,
    lineKey: null,
    name: "Produto ainda sem contagem inicial",
    active: true,
    inventoriedAt: null,
    version: 1,
    physical: "0",
    reserved: "0",
    available: "0",
    origins: [],
  },
];
const empty = params.has("empty");
const stockView = ["items", "shortage", "reservations", "receipts"].includes(
  view,
);
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "preview",
      name: "Revisão sintética",
      email: "preview@example.test",
      role: admin ? "ADMIN" : "OPERATOR",
    }}
  >
    <section className="operation-composition flex min-w-0 flex-col gap-5">
      <h1>{stockView ? "Estoque" : "Produção e entrega"}</h1>
      <p>Prévia com dados sintéticos. Sem persistência.</p>
      <nav aria-label="Prévia das visões" className="flex flex-wrap gap-2">
        {[
          "orders",
          "finished",
          "items",
          "receipts",
          "reservations",
          "shortage",
        ].map((name, index) => (
          <Button
            key={name}
            variant={view === name ? "default" : "outline"}
            asChild
          >
            <a href={`?view=${name}&theme=${params.get("theme") ?? "light"}`}>
              {
                [
                  "Ordens",
                  "Peças prontas",
                  "Materiais",
                  "Recebimentos",
                  "Reservas",
                  "Reposição",
                ][index]
              }
            </a>
          </Button>
        ))}
      </nav>
      <FilterPanel activeCount={1}>
        <form>
          <Field
            label="Buscar item"
            name="query"
            defaultValue="Suporte personalizado"
          />
          <Button>Aplicar filtros</Button>
        </form>
      </FilterPanel>
      <OperationListContext
        title={stockView ? "Materiais e movimentações" : "Produção registrada"}
        total={empty ? 0 : 2}
        criteria={["Busca: Suporte personalizado", "Prazo até: 09/11/2026"]}
      />
      {stockView ? (
        <StockPanel
          admin={admin}
          view={view}
          initialDetail={null}
          items={
            empty
              ? []
              : [
                  view === "shortage"
                    ? {
                        ...operationStock,
                        reserved: "3000",
                        available: "-500",
                        shortage: "500",
                      }
                    : operationStock,
                  {
                    ...operationStock,
                    id: "unknown",
                    name: longName,
                    inventoriedAt: null,
                  },
                ]
          }
          receipts={empty ? [] : receipts}
          reservations={empty ? [] : reservations}
          options={{ materials: [], extras: [] }}
          categories={[]}
        />
      ) : (
        <ProductionPanel
          orders={empty ? [] : orders}
          finished={empty ? [] : finished}
          options={operationOptions}
          admin={admin}
          sale={null}
          view={view}
        />
      )}
      <OperationResults
        total={empty ? 0 : 2}
        page={1}
        pageSize={20}
        filtered
        href={() => "?view=orders"}
        clearHref="?view=orders"
      />
    </section>
  </AppShell>,
);
