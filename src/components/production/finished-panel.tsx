"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
    <div className="flex min-w-0 flex-col gap-4">
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
      {!mode && (
        <div className="operation-list grid gap-3 lg:grid-cols-2">
          {items.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle>
                  <h3>{s.name}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {s.inventoriedAt ? (
                  <dl className="operation-balances grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt>Físico</dt>
                      <dd>{s.physical} un</dd>
                    </div>
                    <div>
                      <dt>Separado para vendas</dt>
                      <dd>{s.reserved} un</dd>
                    </div>
                    <div>
                      <dt>Disponível</dt>
                      <dd>{s.available} un</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline">Não inventariado</Badge>
                    <p>
                      A contagem inicial ainda não foi registrada; o saldo
                      disponível é desconhecido.
                    </p>
                  </div>
                )}
              </CardContent>
              {admin && (
                <CardFooter>
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
                </CardFooter>
              )}
              <details>
                <summary>Origens das peças</summary>
                {s.origins.map((o) => (
                  <p key={o.id}>
                    {names[o.kind] ?? o.kind}: físico {o.physical} un,
                    disponível {o.available} un
                  </p>
                ))}
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
