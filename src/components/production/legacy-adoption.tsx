"use client";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type { SaleProduction } from "@/server/production/queries";
import { count, text, Toggle } from "./shared";
export function LegacyAdoption({
  sale,
  onDone,
}: {
  sale: SaleProduction;
  onDone: () => void;
}) {
  return (
    <ActionForm
      revision={sale.version}
      title="Adotar produção nesta venda antiga"
      submit="Confirmar conciliação"
      onDone={onDone}
      onSubmit={(f, operationKey) => {
        if (f.get("checked") !== "on")
          throw new Error(
            "Confira reservas, consumos e contagens antes da adesão.",
          );
        return productionCommand("ADOPT", {
          operationKey,
          expectedVersion: sale.version,
          saleId: sale.id,
          reason: text(f, "reason"),
          lines: sale.lines.map((l) => ({
            saleItemId: l.id,
            lineKey: l.lineKey,
            recognizedReadyUnits: count(f, `ready${l.id}`),
            recognizedDeliveredUnits: count(f, `delivered${l.id}`),
          })),
        });
      }}
    >
      <p>
        Informe apenas quantidades comprovadas. O estado antigo não será
        convertido automaticamente em peças ou consumo.
      </p>
      {sale.lines.map((l) => (
        <div key={l.id} className="rounded border p-3">
          <h3>
            {l.description} · {l.sold} vendidas
          </h3>
          <Field
            label={`Peças prontas reconhecidas · ${l.description}`}
            name={`ready${l.id}`}
            type="number"
            min={0}
            defaultValue="0"
            required
          />
          <Field
            label={`Peças já entregues · ${l.description}`}
            name={`delivered${l.id}`}
            type="number"
            min={0}
            defaultValue="0"
            required
          />
        </div>
      ))}
      <Field
        label="Justificativa da conciliação"
        name="reason"
        required
        minLength={3}
      />
      <Toggle
        name="checked"
        label="Conferi as reservas, os consumos anteriores e as quantidades declaradas"
      />
    </ActionForm>
  );
}
