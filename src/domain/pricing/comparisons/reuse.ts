import type { PricingCatalogDTO, PricingV2Input, Ref } from "../types";
import { requestFromInput } from "../resolve";
export function reviewComparisonOffer(
  input: PricingV2Input,
  catalog: PricingCatalogDTO,
) {
  const changes: string[] = [];
  const ref = (
    rows: { id: string; version: number; active: boolean; name: string }[],
    old: Ref,
    label: string,
  ): Ref => {
    const row = rows.find((r) => r.id === old.id && r.active);
    if (!row) {
      changes.push(
        `${label}: indisponível; selecione uma substituição no rascunho.`,
      );
      return { id: "", version: 1 };
    }
    changes.push(
      `${label}: versão histórica ${old.version} → atual ${row.version} (${row.name}).`,
    );
    return { id: row.id, version: row.version };
  };
  const request = requestFromInput(input, catalog.settings?.version ?? 1);
  request.mode = "INFORMED";
  request.materials = request.materials.map((m, i) => {
    const current = catalog.materials.find(
      (r) => r.id === m.ref.id && r.active,
    );
    changes.push(
      `${input.materials[i].name}: ${input.materials[i].pricePerBase} → ${current?.price ?? "indisponível"} R$/kg ou litro.`,
    );
    return {
      ...m,
      ref: ref(catalog.materials, m.ref, input.materials[i].name),
    };
  });
  request.printerRef = ref(catalog.printers, request.printerRef, "Impressora");
  const printer = catalog.printers.find((p) => p.id === input.printer.ref.id);
  changes.push(
    `Impressora (potência/aquisição/meses/dias/horas): ${input.printer.watts}/${input.printer.acquisitionCost}/${input.printer.amortizationMonths}/${input.printer.daysPerMonth}/${input.printer.hoursPerDay} → ${printer ? `${printer.watts}/${printer.acquisitionCost}/${printer.amortizationMonths}/${printer.daysPerMonth}/${printer.hoursPerDay}` : "indisponível"}.`,
  );
  request.channelRef = ref(catalog.channels, request.channelRef, "Canal");
  const channel = catalog.channels.find((c) => c.id === input.channel.ref.id);
  changes.push(
    `Canal: fixo ${input.channel.fixedCost} → ${channel?.fixedCost ?? "indisponível"}; taxas ${input.channel.fees.map((f) => `${f.label} ${f.percent}%`).join(", ") || "nenhuma"} → ${channel?.fees.map((f) => `${f.label} ${f.percent}%`).join(", ") || "nenhuma/disponibilidade a conferir"}.`,
  );
  request.extras = request.extras.map((e, i) => {
    const current = catalog.extras.find((r) => r.id === e.ref.id && r.active);
    changes.push(
      `${input.extras[i].name}: ${input.extras[i].unitCost} → ${current?.unitCost ?? "indisponível"} R$.`,
    );
    return { ...e, ref: ref(catalog.extras, e.ref, input.extras[i].name) };
  });
  for (const [key, label] of [
    ["energyRate", "Energia"],
    ["maintenancePerHour", "Manutenção/h"],
    ["failurePercent", "Falhas (%)"],
    ["laborPerHour", "Trabalho/h"],
    ["markupPercent", "Markup (%)"],
    ["targetMarginPercent", "Meta de contribuição (%)"],
  ] as const)
    changes.push(
      `${label}: ${input[key]} → ${catalog.settings?.[key] ?? "não configurado"}.`,
    );
  return { request, changes };
}
