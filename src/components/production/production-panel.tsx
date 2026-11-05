"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { OperationWorkspace } from "@/components/admin/operation-workspace";
import { OrderSummary } from "./order-summary";
import { Notice } from "@/components/ui/field";
import { api } from "@/lib/client-api";
import type { OrderDTO } from "@/domain/production/types";
import type {
  OrderDetail as Detail,
  ProductionOptions,
  FinishedDetail,
  SaleProduction,
} from "@/server/production/queries";
import { OrderForm } from "./order-form";
import { OrderDetail } from "./order-detail";
import { FinishedPanel } from "./finished-panel";
import { DeliveryForm } from "./delivery-form";
import { LegacyAdoption } from "./legacy-adoption";
import { DeliveryHistory } from "./delivery-history";
export function ProductionPanel({
  orders,
  finished,
  options,
  admin,
  sale: initialSale,
  view,
}: {
  orders: OrderDTO[];
  finished: FinishedDetail[];
  options: ProductionOptions;
  admin: boolean;
  sale: SaleProduction | null;
  view: string;
}) {
  const router = useRouter();
  const loading = useRef(false);
  const opener = useRef("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null),
    [create, setCreate] = useState(false),
    [sale, setSale] = useState(initialSale),
    [error, setError] = useState("");
  async function load(id: string) {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      setDetail(await api<Detail>(`/api/production/orders/${id}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    if (detail) await load(detail.id);
    if (sale) {
      try {
        setSale(await api<SaleProduction>(`/api/production/sales/${sale.id}`));
      } catch (e) {
        setError((e as Error).message);
      }
    }
    router.refresh();
  }
  function operationDone() {
    setError("");
    setFeedback("Operação concluída. Confira os saldos atualizados.");
    void refresh();
  }
  return (
    <OperationWorkspace>
      {feedback && <Notice kind="success">{feedback}</Notice>}
      {error && <Notice>{error}</Notice>}
      {busy && <p role="status">Carregando ordem…</p>}
      {sale && (
        <DeliveryHistory sale={sale} admin={admin} onDone={operationDone} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          data-preserve-draft
          className="self-start"
          variant="outline"
          onClick={() => void refresh()}
        >
          Atualizar saldos sem apagar campos
        </Button>
        {!detail &&
          !create &&
          view !== "finished" &&
          sale?.fulfillmentMode !== "LEGACY" && (
            <Button disabled={busy} onClick={() => setCreate(true)}>
              Nova ordem
            </Button>
          )}
      </div>
      {view === "finished" ? (
        <FinishedPanel
          items={finished}
          options={options}
          admin={admin}
          onDone={operationDone}
        />
      ) : (
        <>
          {sale && sale.fulfillmentMode === "LEGACY" ? (
            admin ? (
              <LegacyAdoption sale={sale} onDone={operationDone} />
            ) : (
              <Notice kind="info">
                Venda antiga: um administrador pode conciliar e adotar o fluxo
                de produção.
              </Notice>
            )
          ) : (
            <>
              {create ? (
                <OrderForm
                  options={options}
                  saleId={sale?.id}
                  onDone={() => {
                    setCreate(false);
                    operationDone();
                  }}
                  onCancel={() => setCreate(false)}
                />
              ) : detail ? (
                <OrderDetail
                  order={detail}
                  options={options}
                  admin={admin}
                  onDone={operationDone}
                  onBack={() => {
                    setDetail(null);
                    requestAnimationFrame(() =>
                      document.getElementById(opener.current)?.focus(),
                    );
                  }}
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {orders.map((o) => (
                    <Card key={o.id}>
                      <CardHeader>
                        <CardTitle>
                          <h2>OP-{String(o.sequence).padStart(6, "0")}</h2>
                        </CardTitle>
                        <p className="break-words">
                          {o.lines.map((l) => l.description).join(", ")}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <OrderSummary
                          order={o}
                          users={options.users}
                          printers={options.printers}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button
                          disabled={busy}
                          variant="outline"
                          id={`open-order-${o.id}`}
                          onClick={() => {
                            opener.current = `open-order-${o.id}`;
                            void load(o.id);
                          }}
                          aria-label={`Abrir ordem OP-${String(o.sequence).padStart(6, "0")}`}
                        >
                          Abrir ordem
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
              {sale && !detail && !create && (
                <DeliveryForm
                  sale={sale}
                  finished={finished}
                  onDone={operationDone}
                />
              )}
            </>
          )}
        </>
      )}
    </OperationWorkspace>
  );
}
