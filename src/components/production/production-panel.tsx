"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { names } from "./shared";
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
  const [detail, setDetail] = useState<Detail | null>(null),
    [create, setCreate] = useState(false),
    [sale, setSale] = useState(initialSale),
    [error, setError] = useState("");
  async function load(id: string) {
    try {
      setDetail(await api<Detail>(`/api/production/orders/${id}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
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
  return (
    <div className="space-y-5">
      {error && <Notice>{error}</Notice>}
      {sale && (
        <DeliveryHistory
          sale={sale}
          admin={admin}
          onDone={() => void refresh()}
        />
      )}
      <Button variant="outline" onClick={() => void refresh()}>
        Atualizar saldos sem apagar campos
      </Button>
      {view === "finished" ? (
        <FinishedPanel
          items={finished}
          options={options}
          admin={admin}
          onDone={() => void refresh()}
        />
      ) : (
        <>
          {sale && sale.fulfillmentMode === "LEGACY" ? (
            admin ? (
              <LegacyAdoption sale={sale} onDone={() => void refresh()} />
            ) : (
              <Notice kind="info">
                Venda antiga: um administrador pode conciliar e adotar o fluxo
                de produção.
              </Notice>
            )
          ) : (
            <>
              {!detail && !create && (
                <Button onClick={() => setCreate(true)}>Nova ordem</Button>
              )}
              {create ? (
                <OrderForm
                  options={options}
                  saleId={sale?.id}
                  onDone={() => {
                    setCreate(false);
                    void refresh();
                  }}
                  onCancel={() => setCreate(false)}
                />
              ) : detail ? (
                <OrderDetail
                  order={detail}
                  options={options}
                  admin={admin}
                  onDone={() => void refresh()}
                  onBack={() => setDetail(null)}
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {orders.map((o) => (
                    <Card key={o.id} className="p-4 space-y-2">
                      <h2>OP-{String(o.sequence).padStart(6, "0")}</h2>
                      <p>
                        {names[o.origin]} · {names[o.status]}
                      </p>
                      <p>{o.lines.map((l) => l.description).join(", ")}</p>
                      <p>Prazo: {o.dueDate ?? "Não definido"}</p>
                      <Button variant="outline" onClick={() => void load(o.id)}>
                        Abrir ordem
                      </Button>
                    </Card>
                  ))}
                  {!orders.length && <p>Nenhuma ordem encontrada.</p>}
                </div>
              )}
              {sale && !detail && !create && (
                <DeliveryForm
                  sale={sale}
                  finished={finished}
                  onDone={() => void refresh()}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
