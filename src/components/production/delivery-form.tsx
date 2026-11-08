"use client";
import { useState } from "react";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type {
  FinishedDetail,
  SaleProduction,
} from "@/server/production/queries";
import { DateReason, text, count, optional, names } from "./shared";
export function DeliveryForm({
  sale,
  finished,
  onDone,
}: {
  sale: SaleProduction;
  finished: FinishedDetail[];
  onDone: () => void;
}) {
  const [lineKey, setLineKey] = useState(sale.lines[0]?.lineKey ?? ""),
    [originId, setOriginId] = useState("");
  const line = sale.lines.find((l) => l.lineKey === lineKey);
  const stocks = finished.filter((s) =>
    line?.productId
      ? s.productId === line.productId
      : s.ownerSaleId === sale.id && s.lineKey === lineKey,
  );
  const stock = stocks.find((s) => s.origins.some((o) => o.id === originId));
  return (
    <div className="space-y-4">
      <h2>Separação e entrega</h2>
      <ul className="operation-lines">
        {sale.lines.map((l) => (
          <li key={l.id}>
            <p className="operation-line-name">{l.description}</p>
            <dl className="operation-balances">
              <div>
                <dt>Vendidas</dt>
                <dd>{l.sold} un</dd>
              </div>
              <div>
                <dt>Entregues</dt>
                <dd>{l.delivered} un</dd>
              </div>
              <div>
                <dt>Separadas para entrega</dt>
                <dd>{l.commitments.reduce((n, c) => n + c.remaining, 0)} un</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <ActionForm
        revision={`${sale.version}:${stock?.version}`}
        title="Separar peças prontas para esta venda"
        summary={
          <section className="admin-summary-card">
            <h3>Separação de peças</h3>
            <p>{line?.description ?? "Selecione o item"}</p>
            <p>
              Reserva peças boas por origem para esta venda. O saldo físico só
              diminui na entrega.
            </p>
          </section>
        }
        submit="Confirmar separação"
        onDone={onDone}
        onSubmit={(f, operationKey) =>
          productionCommand("RESERVE_FINISHED", {
            operationKey,
            expectedVersion: stock?.version,
            saleVersion: sale.version,
            saleId: sale.id,
            lineKey,
            stockId: stock?.id,
            units: count(f, "units"),
            originAllocations: [{ originId, units: count(f, "units") }],
          })
        }
      >
        <label className="field">
          Item da venda
          <select
            name="lineKey"
            value={lineKey}
            onChange={(e) => {
              setLineKey(e.target.value);
              setOriginId("");
            }}
          >
            {sale.lines.map((l) => (
              <option key={l.id} value={l.lineKey}>
                {l.description}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Peças disponíveis por origem
          <select
            required
            name="originId"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
          >
            <option value="">Selecione</option>
            {stocks.flatMap((s) =>
              s.origins
                .filter(
                  (o) =>
                    Number(o.available) > 0 &&
                    (!o.restrictedSaleId || o.restrictedSaleId === sale.id),
                )
                .map((o, i) => (
                  <option key={o.id} value={o.id}>
                    {s.name} · {names[o.kind] ?? o.kind} {i + 1} · {o.available}{" "}
                    disponíveis
                  </option>
                )),
            )}
          </select>
        </label>
        <Field
          label="Quantidade a separar"
          name="units"
          type="number"
          min={1}
          step={1}
          required
        />
        <p>
          Se faltarem peças, crie uma ordem. Metas de ordens existentes já
          comprometem a demanda da venda.
        </p>
      </ActionForm>
      <ActionForm
        revision={sale.version}
        title="Registrar entrega parcial ou total"
        summary={
          <section className="admin-summary-card">
            <h3>Conferência da entrega</h3>
            <p>Revise as quantidades de cada origem antes de confirmar.</p>
            <p>
              Apenas as peças informadas saem do estoque. Esta confirmação não
              registra pagamento.
            </p>
          </section>
        }
        submit="Confirmar entrega"
        onDone={onDone}
        onSubmit={(f, operationKey) =>
          productionCommand("DELIVER", {
            operationKey,
            expectedVersion: sale.version,
            saleId: sale.id,
            lines: sale.lines
              .map((l) => ({
                lineKey: l.lineKey,
                allocations: l.commitments
                  .map((c) => ({ commitmentId: c.id, units: count(f, c.id) }))
                  .filter((c) => c.units > 0),
              }))
              .filter((l) => l.allocations.length),
            effectiveDate: text(f, "effectiveDate"),
            notes: text(f, "notes"),
            reason: optional(f, "reason"),
          })
        }
      >
        {sale.lines.map((l) => (
          <div key={l.id}>
            <h3>{l.description}</h3>
            {l.commitments
              .filter((c) => c.remaining > 0)
              .map((c, i) => (
                <Field
                  key={c.id}
                  label={`Entregar da origem ${i + 1} · ${l.description} (${c.remaining} prontas)`}
                  name={c.id}
                  type="number"
                  min={0}
                  max={c.remaining}
                  step={1}
                  defaultValue="0"
                />
              ))}
          </div>
        ))}
        <DateReason />
        <Field label="Observação da entrega" name="notes" />
        <p>
          Somente as quantidades informadas sairão do estoque. A entrega não
          registra pagamento.
        </p>
      </ActionForm>
      {sale.lines.flatMap((l) =>
        l.commitments
          .filter((c) => c.remaining > 0)
          .map((c) => (
            <ActionForm
              key={c.id}
              revision={c.stockVersion}
              title={`Liberar peças separadas · ${l.description}`}
              onDone={onDone}
              onSubmit={(f, operationKey) =>
                productionCommand("RELEASE_FINISHED", {
                  operationKey,
                  expectedVersion: c.stockVersion,
                  commitmentId: c.id,
                  units: count(f, "units"),
                  reason: text(f, "reason"),
                })
              }
            >
              <Field
                label="Quantidade a liberar"
                name="units"
                type="number"
                min={1}
                max={c.remaining}
                required
              />
              <Field
                label="Motivo da liberação"
                name="reason"
                minLength={3}
                required
              />
            </ActionForm>
          )),
      )}
    </div>
  );
}
