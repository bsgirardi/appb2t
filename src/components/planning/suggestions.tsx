"use client";
import type { Suggestion } from "@/domain/planning/types";
import { Button } from "@/components/ui/button";
import type { PlanningData } from "./shared";
export function Suggestions({
  data,
  onApply,
}: {
  data: PlanningData;
  onApply: (s: Suggestion) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2>Sugestões para revisão</h2>
      <p>
        Agrupam peças livres com máquina, material e cor já declarados em lotes.
        Dados ausentes ou divergentes exigem montagem manual. Confira perfil,
        encaixe e tempo no fatiador.
      </p>
      {!data.suggestions.length && (
        <p>Nenhum agrupamento com dados suficientes.</p>
      )}
      {data.suggestions.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3">
          <p>
            {data.printers.find((p) => p.id === s.printerId)?.name} ·{" "}
            {data.materials.find((m) => m.id === s.materialItemId)?.name} ·{" "}
            {s.colorKey} · {s.candidates.reduce((n, c) => n + c.units, 0)} peças
          </p>
          <Button variant="outline" onClick={() => onApply(s)}>
            Revisar sugestão {i + 1}
          </Button>
        </div>
      ))}
    </section>
  );
}
