"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { productionCommand } from "@/lib/production-client";
import type {
  FinishedDetail,
  ProductionOptions,
} from "@/server/production/queries";
import { DateReason, text, decimal, count, names, optional } from "./shared";
export function FinishedPanel({
  items,
  options,
  admin,
  onDone,
}: {
  items: FinishedDetail[];
  options: ProductionOptions;
  admin: boolean;
  onDone: () => void;
}) {
  const [mode, setMode] = useState(""),
    [selected, setSelected] = useState("");
  const item = items.find((s) => s.id === selected);
  const done = () => {
    setMode("");
    onDone();
  };
  return (
    <div className="space-y-4">
      <h2>Produtos acabados</h2>
      <p>
        Disponível é o saldo de peças boas menos as peças separadas para vendas.
        Não é permitido saldo negativo.
      </p>
      {admin && (
        <Button onClick={() => setMode("enable")}>Habilitar produto</Button>
      )}
      {mode === "enable" && admin && (
        <ActionForm
          title="Habilitar estoque de produto"
          onDone={done}
          onCancel={() => setMode("")}
          onSubmit={(f, operationKey) =>
            productionCommand("FINISHED_SAVE", {
              operationKey,
              expectedVersion: 0,
              productId: text(f, "productId"),
              active: true,
            })
          }
        >
          <Select
            label="Produto"
            name="productId"
            options={options.products
              .filter((p) => !items.some((i) => i.productId === p.id))
              .map((p) => ({ value: p.id, label: p.name }))}
          />
          <p>A contagem inicial será registrada na próxima etapa.</p>
        </ActionForm>
      )}
      {item && admin && ["open", "adjust"].includes(mode) && (
        <ActionForm
          revision={item.version}
          title={`${mode === "open" ? "Contagem inicial" : "Ajustar contagem"} · ${item.name}`}
          onDone={done}
          onCancel={() => setMode("")}
          onSubmit={(f, operationKey) =>
            productionCommand(
              mode === "open" ? "FINISHED_OPEN" : "FINISHED_ADJUST",
              {
                operationKey,
                expectedVersion: item.version,
                stockId: item.id,
                ...(mode === "open"
                  ? { units: count(f, "units") }
                  : { deltaUnits: count(f, "units") }),
                value: decimal(f, "value"),
                effectiveDate: text(f, "effectiveDate"),
                reason: optional(f, "reason"),
              },
            )
          }
        >
          <Field
            label={
              mode === "open"
                ? "Peças contadas"
                : "Variação de peças (negativa para reduzir)"
            }
            name="units"
            type="number"
            min={mode === "open" ? 0 : undefined}
            step={1}
            required
          />
          <Field
            label="Valor total conhecido (R$)"
            name="value"
            inputMode="decimal"
            hint="Deixe vazio quando desconhecido. Zero significa custo zero declarado."
          />
          <DateReason required={mode === "adjust"} />
          <p>
            Esta ação altera a contagem física e não cria cobrança ou pagamento.
          </p>
        </ActionForm>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <h3>{s.name}</h3>
            {s.inventoriedAt ? (
              <p>
                Físico: {s.physical} · separado: {s.reserved} · disponível:{" "}
                {s.available}
              </p>
            ) : (
              <p>Não inventariado</p>
            )}
            {admin && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(s.id);
                  setMode(s.inventoriedAt ? "adjust" : "open");
                }}
              >
                {s.inventoriedAt
                  ? "Ajustar contagem"
                  : "Registrar contagem inicial"}
              </Button>
            )}
            <details>
              <summary>Origens das peças</summary>
              {s.origins.map((o) => (
                <p key={o.id}>
                  {names[o.kind] ?? o.kind}: físico {o.physical}, disponível{" "}
                  {o.available}
                </p>
              ))}
            </details>
          </Card>
        ))}
      </div>
      {!items.length && <p>Nenhum produto habilitado nesta página.</p>}
    </div>
  );
}
