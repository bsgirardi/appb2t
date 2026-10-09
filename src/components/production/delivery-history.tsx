"use client";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import type { SaleProduction } from "@/server/production/queries";
import { productionCommand } from "@/lib/production-client";
import { DateReason, Toggle, count, text } from "./shared";
export function DeliveryHistory({
  sale,
  admin,
  onDone,
}: {
  sale: SaleProduction;
  admin: boolean;
  onDone: () => void;
}) {
  return (
    <details>
      <summary>Histórico de entregas e correções</summary>
      {sale.deliveries.map((d) => (
        <div key={d.id} className="rounded border p-3 space-y-3">
          <p>
            {d.effectiveDate} · {d.sourceId ? "Correção" : "Entrega"} ·{" "}
            {d.notes}
          </p>
          {d.lines.map((l) => (
            <p key={l.id}>
              {sale.lines.find((x) => x.lineKey === l.lineKey)?.description}:{" "}
              {l.units} peças
            </p>
          ))}
          {admin && !d.sourceId && d.lines.some((l) => l.remaining > 0) && (
            <ActionForm
              title="Corrigir erro de lançamento"
              revision={d.version}
              onDone={onDone}
              onSubmit={(f, operationKey) => {
                if (f.get("entryError") !== "on")
                  throw new Error(
                    "Confirme que se trata de erro de lançamento.",
                  );
                return productionCommand("CORRECT_DELIVERY", {
                  operationKey,
                  expectedVersion: d.version,
                  deliveryId: d.id,
                  declaration: "ENTRY_ERROR",
                  effectiveDate: text(f, "effectiveDate"),
                  reason: text(f, "reason"),
                  lines: d.lines
                    .map((l) => ({
                      deliveryLineId: l.id,
                      units: count(f, l.id),
                    }))
                    .filter((l) => l.units > 0),
                });
              }}
            >
              {d.lines
                .filter((l) => l.remaining > 0)
                .map((l) => (
                  <Field
                    key={l.id}
                    label={`Quantidade registrada a mais · ${sale.lines.find((x) => x.lineKey === l.lineKey)?.description}`}
                    name={l.id}
                    type="number"
                    min={0}
                    max={l.remaining}
                    defaultValue="0"
                  />
                ))}
              <DateReason required />
              <Toggle
                name="entryError"
                label="Declaro que estas peças não foram entregues fisicamente"
              />
              <p>
                A correção repõe saldo e separação. Devolução física de cliente
                exige tratamento comercial próprio.
              </p>
            </ActionForm>
          )}
        </div>
      ))}
    </details>
  );
}
