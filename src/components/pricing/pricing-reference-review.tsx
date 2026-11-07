"use client";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { Button } from "@/components/ui/button";
export function PricingReferenceReview({
  current,
  review,
  refresh,
  accept,
  onKeep,
}: {
  current: PricingCatalogDTO;
  review: PricingCatalogDTO | null;
  refresh: () => Promise<void>;
  accept: () => void;
  onKeep: () => void;
}) {
  return (
    <>
      {" "}
      <Button type="button" variant="outline" onClick={refresh}>
        Revisar parâmetros atuais
      </Button>
      {review && (
        <section className="rounded-lg border p-4 space-y-3">
          <h3>Revisar alterações antes de aplicar</h3>
          {(current.tax || review.tax) && (
            <p>
              Configuração tributária: revisão {current.tax?.version ?? 0} →{" "}
              {review.tax?.version ?? 0}. Aplicar os parâmetros atuais seleciona
              novamente o perfil da competência deste cálculo; memórias salvas
              permanecem preservadas.
            </p>
          )}
          <p>
            Energia: {current.settings?.energyRate ?? "não configurada"} →{" "}
            {review.settings?.energyRate ?? "não configurada"} R$/kWh. Trabalho:{" "}
            {current.settings?.laborPerHour ?? "não configurado"} →{" "}
            {review.settings?.laborPerHour ?? "não configurado"} R$/hora.
          </p>
          <p>
            Manutenção: {current.settings?.maintenancePerHour ?? "—"} →{" "}
            {review.settings?.maintenancePerHour ?? "—"}. Falhas:{" "}
            {current.settings?.failurePercent ?? "—"} →{" "}
            {review.settings?.failurePercent ?? "—"}%. Markup:{" "}
            {current.settings?.markupPercent ?? "—"} →{" "}
            {review.settings?.markupPercent ?? "—"}%. Margem:{" "}
            {current.settings?.targetMarginPercent ?? "—"} →{" "}
            {review.settings?.targetMarginPercent ?? "—"}%.
          </p>
          <ul>
            {review.materials.map((m) => (
              <li key={m.id}>
                {m.name}:{" "}
                {current.materials.find((x) => x.id === m.id)?.price ?? "novo"}{" "}
                → {m.price} R$/kg ou litro.
              </li>
            ))}
          </ul>
          <ul>
            {current.materials
              .filter((m) => !review.materials.some((n) => n.id === m.id))
              .map((m) => (
                <li key={m.id}>{m.name}: indisponível no catálogo atual.</li>
              ))}
          </ul>
          <ul>
            {review.printers.map((p) => {
              const old = current.printers.find((x) => x.id === p.id);
              return (
                <li key={p.id}>
                  {p.name} — Potência: {old?.watts ?? "novo"} → {p.watts} W.
                  Aquisição: {old?.acquisitionCost ?? "—"} → {p.acquisitionCost}
                  . Meses: {old?.amortizationMonths ?? "—"} →{" "}
                  {p.amortizationMonths}. Dias/mês: {old?.daysPerMonth ?? "—"} →{" "}
                  {p.daysPerMonth}. Horas/dia: {old?.hoursPerDay ?? "—"} →{" "}
                  {p.hoursPerDay}.
                </li>
              );
            })}
          </ul>
          <ul>
            {review.extras.map((x) => (
              <li key={x.id}>
                {x.name}:{" "}
                {current.extras.find((e) => e.id === x.id)?.unitCost ?? "novo"}{" "}
                → {x.unitCost} R$.
              </li>
            ))}
          </ul>
          <ul>
            {review.channels.map((c) => {
              const old = current.channels.find((x) => x.id === c.id);
              return (
                <li key={c.id}>
                  {c.name} — Custo fixo: {old?.fixedCost ?? "novo"} →{" "}
                  {c.fixedCost}. Taxas:{" "}
                  {old?.fees
                    .map((f) => `${f.label}: ${f.percent}%`)
                    .join(", ") || "nenhuma"}{" "}
                  →{" "}
                  {c.fees.map((f) => `${f.label}: ${f.percent}%`).join(", ") ||
                    "nenhuma"}
                  .
                </li>
              );
            })}
          </ul>
          <ul>
            {[...current.printers, ...current.extras, ...current.channels]
              .filter(
                (x) =>
                  ![
                    ...review.printers,
                    ...review.extras,
                    ...review.channels,
                  ].some((n) => n.id === x.id),
              )
              .map((x) => (
                <li key={x.id}>{x.name}: indisponível no catálogo atual.</li>
              ))}
          </ul>
          <p>Referências indisponíveis precisarão ser substituídas.</p>
          <Button type="button" onClick={accept}>
            Aplicar parâmetros revisados
          </Button>{" "}
          <Button type="button" variant="outline" onClick={onKeep}>
            Manter parâmetros anteriores
          </Button>
        </section>
      )}
    </>
  );
}
