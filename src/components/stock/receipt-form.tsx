"use client";
import { useState } from "react";
import { ActionForm } from "@/components/finance/shared";
import { Field, Notice } from "@/components/ui/field";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { StockItemDTO } from "@/server/stock/queries";
import { stockCommand } from "@/lib/stock-client";
import {
  DateReason,
  QuantityFields,
  IdentityField,
  text,
  base,
  allocation,
  optionalReason,
} from "./shared";
export function ReceiptForm({
  items,
  onDone,
  onCancel,
  send = stockCommand,
}: {
  items: StockItemDTO[];
  onDone: () => void;
  onCancel?: () => void;
  send?: typeof stockCommand;
}) {
  const [rows, setRows] = useState([{ key: 1, itemId: "" }]);
  const [catalog, setCatalog] = useState(items),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  async function find() {
    try {
      const r = await api<{ items: StockItemDTO[] }>(
        `/api/stock/items?query=${encodeURIComponent(query)}&pageSize=100`,
      );
      setCatalog((old) => [
        ...old.filter((i) => !r.items.some((n) => n.id === i.id)),
        ...r.items,
      ]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <ActionForm
      title="Receber compra"
      submit="Confirmar recebimento físico"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        send("RECEIVE", {
          operationKey,
          expectedVersion: 0,
          supplier: text(f, "supplier"),
          document: text(f, "document"),
          effectiveDate: text(f, "effectiveDate"),
          reason: optionalReason(f),
          lines: rows.map((r) => {
            const item = catalog.find((i) => i.id === r.itemId);
            if (!item) throw new Error("Selecione o item de cada linha.");
            const quantity = base(f, item, String(r.key));
            return {
              itemId: item.id,
              quantity,
              allocations: allocation(f, quantity, String(r.key)),
            };
          }),
        })
      }
    >
      <p>
        O material fica disponível imediatamente. A conferência financeira é
        feita pelo administrador.
      </p>
      <Field
        label="Fornecedor"
        name="supplier"
        minLength={2}
        maxLength={160}
        required
      />
      <Field label="Documento" name="document" maxLength={160} />
      <DateReason />
      <Field
        label="Localizar material para adicionar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button variant="outline" type="button" onClick={() => void find()}>
        Buscar materiais
      </Button>
      {error && <Notice>{error}</Notice>}
      {rows.map((r, index) => {
        const item = catalog.find((i) => i.id === r.itemId);
        return (
          <div
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
            key={r.key}
          >
            <label className="field">
              Item {index + 1}
              <NativeSelect
                aria-label={`Item ${index + 1}`}
                name={`item${r.key}`}
                required
                value={r.itemId}
                onChange={(e) =>
                  setRows(
                    rows.map((x) =>
                      x.key === r.key ? { ...x, itemId: e.target.value } : x,
                    ),
                  )
                }
              >
                <option value="">Selecione</option>
                {catalog
                  .filter((i) => i.active && i.inventoriedAt)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </NativeSelect>
            </label>
            <QuantityFields
              key={item?.id}
              item={item}
              suffix={String(r.key)}
              label={`Quantidade ${index + 1}`}
            />
            <IdentityField item={item} suffix={String(r.key)} />
            {rows.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
              >
                Remover linha {index + 1}
              </Button>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        disabled={rows.length >= 100}
        onClick={() =>
          setRows([
            ...rows,
            { key: Math.max(...rows.map((r) => r.key)) + 1, itemId: "" },
          ])
        }
      >
        Adicionar linha
      </Button>
      <p className="text-sm text-muted-foreground">
        Para dividir entre rolos/lotes, adicione linhas do mesmo item com
        identificações diferentes.
      </p>
    </ActionForm>
  );
}
