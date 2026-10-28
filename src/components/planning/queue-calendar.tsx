"use client";
import { useMemo, useState } from "react";
import type { BatchDTO } from "@/domain/planning/types";
import { timelineSegments, timelineWindow } from "@/domain/planning/timeline";
import { civilDay } from "@/domain/planning/calendar";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import { forecastReasons } from "./queue-simulation";
import { instantLabel, type PlanningData } from "./shared";
const phases = [
  { kind: "prepare", label: "Preparação", style: "bg-secondary text-secondary-foreground border" },
  { kind: "print", label: "Impressão", style: "bg-primary text-primary-foreground" },
  { kind: "waitingRemoval", label: "Espera pela equipe", style: "bg-muted text-muted-foreground border border-dashed" },
  { kind: "removal", label: "Retirada", style: "bg-accent text-accent-foreground border" },
] as const;
export function QueueCalendar({ data, batches, onSelect }: { data: PlanningData; batches: BatchDTO[]; onSelect: (id: string) => void }) {
  const [week, setWeek] = useState(0);
  const window = useMemo(() => timelineWindow(data.asOf, week), [data.asOf, week]);
  const start = Date.parse(window.start), end = Date.parse(window.end), span = end - start;
  const visible = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches]);
  const segments = useMemo(() => timelineSegments(data.forecast, window).filter(s => visible.has(s.batchId)), [data.forecast, window, visible]);
  const forecasts = new Map(data.forecast.batches.map(f => [f.batchId, f]));
  const incomplete = batches.filter(b => !["CLOSED", "CANCELED"].includes(b.state) && (!forecasts.get(b.id)?.removal || forecasts.get(b.id)?.reason));
  const days = Array.from({ length: Math.ceil(span / 86400000) }, (_, i) => new Date(start + i * 86400000).toISOString());
  return <section className="flex min-w-0 flex-col gap-3" aria-label="Calendário visual">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled={week === 0} onClick={() => setWeek(w => Math.max(0, w - 1))}>Semana anterior</Button>
      <Button variant="outline" disabled={week === 12} onClick={() => setWeek(w => Math.min(12, w + 1))}>Próxima semana</Button>
      <p>{instantLabel(window.start)} → {instantLabel(window.end)}</p>
    </div>
    <p className="text-sm">Horário de São Paulo. As faixas distinguem preparação, impressão, espera pela equipe e retirada. Use a lista para simular mudanças de ordem.</p>
    <div className="max-w-full overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Calendário por impressora">
      <div style={{ minWidth: 1180 }}>
        <div className="flex border-b bg-muted text-muted-foreground">
          <div className="w-44 shrink-0 p-2 font-semibold">Máquina / etapa</div>
          <div className="relative h-14 flex-1">{days.map(iso => <span key={iso} className="absolute inset-y-0 border-l px-2 py-1 text-sm" style={{ left: `${(Date.parse(iso) - start) / span * 100}%` }}>
            {civilDay(iso).split("-").reverse().slice(0, 2).join("/")}<br /><span className="text-xs">00h</span>
          </span>)}</div>
        </div>
        {data.printers.map(printer => <div key={printer.id} className="border-b last:border-b-0">
          <h3 className="bg-muted px-3 py-2 font-semibold">{printer.name}</h3>
          {phases.map(phase => <div key={phase.kind} className="flex border-t">
            <p className="w-44 shrink-0 p-2 text-sm">{phase.label}</p>
            <div className="relative h-12 flex-1" style={{ backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px)", backgroundSize: `${86400000 / span * 100}% 100%` }}>
              {segments.filter(s => s.printerId === printer.id && s.kind === phase.kind).map(s => {
                const batch = visible.get(s.batchId)!;
                const label = `Lote ${batch.sequence} · ${phase.label} · ${instantLabel(s.original.start)} até ${instantLabel(s.original.end)}`;
                const width = (Date.parse(s.visible.end) - Date.parse(s.visible.start)) / span * 100;
                return <button type="button" key={`${s.batchId}-${s.kind}`} onClick={() => onSelect(s.batchId)} title={label} aria-label={label}
                  className={`absolute inset-y-1 min-w-1 overflow-hidden rounded-sm text-xs focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${phase.style}`}
                  style={{ left: `${(Date.parse(s.visible.start) - start) / span * 100}%`, width: `${width}%` }}>
                  {width > 5 ? `Lote ${batch.sequence}` : <span className="sr-only">Lote {batch.sequence}</span>}
                </button>;
              })}
            </div>
          </div>)}
        </div>)}
      </div>
    </div>
    {!segments.length && <p>Nenhuma ocupação prevista nesta semana para os lotes exibidos.</p>}
    {!!incomplete.length && <section aria-label="Lotes sem previsão completa">
      <h3 className="font-semibold">Sem previsão completa</h3>
      <ul>{incomplete.map(b => <li key={b.id} className="flex flex-wrap items-center gap-2 border-b py-2">
        <Button variant="link" onClick={() => onSelect(b.id)}>Lote {b.sequence}</Button>
        <span>{forecasts.get(b.id)?.reason ? forecastReasons[forecasts.get(b.id)!.reason!] : "Lote fora da programação."}</span>
      </li>)}</ul>
    </section>}
    <Notice kind="info">A retirada encerra somente a ocupação modelada. Acabamento, inspeção, embalagem e transporte não estão cobertos. Previsão não é garantia de entrega.</Notice>
  </section>;
}
