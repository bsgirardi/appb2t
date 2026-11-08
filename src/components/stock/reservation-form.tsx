"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionForm, Select } from "@/components/finance/shared";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StockItemDTO, StockReservationDTO } from "@/server/stock/queries";
import type { SaleDTO } from "@/domain/commerce/types";
import { stockCommand } from "@/lib/stock-client";
import { api } from "@/lib/client-api";
import {
  DateReason,
  QuantityFields,
  IdentityField,
  text,
  base,
  allocation,
  optionalReason,
  units,
} from "./shared";
export function ReservationAction({
  reservation,
  item,
  onDone,
  onCancel,
}: {
  reservation: StockReservationDTO;
  item: StockItemDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [action, setAction] = useState("CONSUME");
  return (
    <ActionForm
      revision={item?.version}
      title={`${reservation.saleNumber} · ${reservation.name}`}
      summary={
        <section className="admin-summary-card">
          <h3>{reservation.name}</h3>
          <p>
            Restante reservado: {reservation.remaining}{" "}
            {units[reservation.unit]}
          </p>
          <p>
            {action === "CONSUME"
              ? "Consumo reduz o saldo físico e libera a reserva correspondente."
              : "Liberação desfaz a reserva sem baixar material do estoque."}
          </p>
        </section>
      }
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) => {
        const quantity = base(f, item);
        return stockCommand(action, {
          reservationId: reservation.id,
          expectedVersion: reservation.version,
          operationKey,
          quantity,
          reason: optionalReason(f),
          ...(action === "CONSUME"
            ? {
                effectiveDate: text(f, "effectiveDate"),
                allowExcess: f.get("allowExcess") === "on",
                allocations: allocation(f, quantity),
              }
            : {}),
        });
      }}
    >
      <p>
        Restante reservado: {reservation.remaining} {units[reservation.unit]}
      </p>
      <label className="field">
        Ação
        <select
          name="action"
          className="w-full rounded border bg-background p-2"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="CONSUME">
            Consumir e liberar reserva correspondente
          </option>
          <option value="RELEASE">Liberar sem consumir</option>
        </select>
      </label>
      <QuantityFields item={item} />
      {action === "CONSUME" && (
        <>
          <IdentityField item={item} />
          <label className="flex gap-2">
            <input name="allowExcess" type="checkbox" />
            Confirmo eventual consumo acima da reserva
          </label>
        </>
      )}
      <DateReason />
    </ActionForm>
  );
}
export function SaleStock({ sale }: { sale: SaleDTO }) {
  const router = useRouter(),
    [open, setOpen] = useState(false),
    [items, setItems] = useState<StockItemDTO[]>([]),
    [reservations, setReservations] = useState<StockReservationDTO[]>([]),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [action, setAction] = useState<StockReservationDTO | null>(null);
  async function load() {
    try {
      const [i, r] = await Promise.all([
        api<{ items: StockItemDTO[] }>(
          `/api/stock/items?pageSize=100&query=${encodeURIComponent(query)}`,
        ),
        api<{ items: StockReservationDTO[] }>(
          `/api/stock/reservations?saleId=${sale.id}&pageSize=100`,
        ),
      ]);
      setItems(i.items);
      setReservations(r.items);
      setOpen(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const item = items.find((i) => i.id === selected);
  function done() {
    setAction(null);
    void load();
    router.refresh();
  }
  return (
    <Card className="my-4 p-4 print:hidden">
      <h2>Reservas de materiais</h2>
      {error && <Notice>{error}</Notice>}
      <Button type="button" variant="outline" onClick={() => void load()}>
        Consultar reservas e materiais
      </Button>
      {open && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Field
              label="Buscar material"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void load()}>
              Buscar
            </Button>
          </div>
          {reservations.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <p>
                {r.name}: {r.remaining} {units[r.unit]} reservados ·{" "}
                {r.consumed} consumidos
              </p>
              {Number(r.remaining) > 0 && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const found = await api<StockItemDTO>(
                        `/api/stock/items/${r.itemId}`,
                      );
                      setItems((old) => [
                        ...old.filter((i) => i.id !== found.id),
                        found,
                      ]);
                      setAction(r);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Consumir ou liberar
                </Button>
              )}
            </div>
          ))}
          {action && items.find((i) => i.id === action.itemId) ? (
            <ReservationAction
              reservation={action}
              item={items.find((i) => i.id === action.itemId)!}
              onDone={done}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {["CONFIRMADA", "EM_PRODUCAO"].includes(sale.status) && (
            <ActionForm
              revision={item?.version}
              title="Reservar material para esta venda"
              onDone={done}
              onSubmit={(f, operationKey) => {
                if (!item) throw new Error("Selecione o material.");
                return stockCommand("RESERVE", {
                  saleId: sale.id,
                  lineKey: text(f, "lineKey"),
                  itemId: item.id,
                  quantity: base(f, item),
                  expectedVersion: item.version,
                  operationKey,
                  effectiveDate: text(f, "effectiveDate"),
                  reason: optionalReason(f),
                });
              }}
            >
              <Select
                label="Item da venda"
                name="lineKey"
                options={sale.document.items.map((i) => ({
                  value: i.lineId!,
                  label: i.description,
                }))}
              />
              <label className="field">
                Material
                <select
                  name="stockItem"
                  className="w-full rounded border bg-background p-2"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {items
                    .filter((i) => i.active && i.inventoriedAt)
                    .map((i) => (
                      <option value={i.id} key={i.id}>
                        {i.name} · disponível {i.available} {units[i.unit]}
                      </option>
                    ))}
                </select>
              </label>
              <QuantityFields key={item?.id} item={item} />
              <DateReason />
            </ActionForm>
          )}
          <Link
            href={`/estoque?view=reservations&saleId=${sale.id}`}
            className="underline"
          >
            Ver histórico completo de reservas
          </Link>
        </div>
      )}
    </Card>
  );
}
