"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BatchForecast } from "@/domain/planning/types";
import type { QueuePreview, QueueScenario } from "@/domain/planning/scenario";
import { api } from "@/lib/client-api";
import { planningCommand } from "@/lib/planning-client";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import { instantLabel, type PlanningData } from "./shared";

export const forecastReasons = {
  MISSING_DATA: "configure horários e dados do lote",
  NO_WINDOW: "sem janela contínua nos próximos 90 dias",
  UNCONFIRMED_END: "confirme o término real ou o tempo restante",
  MATERIAL_PENDING: "resolva as pendências de material e confirmação",
};
function forecastLabel(f: BatchForecast) {
  if (f.reason || !f.removal) return `Previsão indisponível: ${f.reason ? forecastReasons[f.reason] : "dados insuficientes"}.`;
  return `${instantLabel(f.removal.end)} · ${!f.dueDate ? "prazo não informado" : f.late ? "após o prazo de produção" : "dentro do prazo de produção"}`;
}
function ForecastCell({ forecast }: { forecast: BatchForecast }) {
  return <><p>{forecastLabel(forecast)}</p><dl className="mt-2 text-xs">{([
    ["Preparação", forecast.prepare], ["Impressão", forecast.print], ["Espera pela equipe", forecast.waitingRemoval], ["Retirada", forecast.removal],
  ] as const).map(([label, interval]) => interval && <div key={label}><dt className="font-semibold">{label}</dt><dd>{instantLabel(interval.start)} → {instantLabel(interval.end)}</dd></div>)}</dl></>;
}
function lifetime(preview: QueuePreview) {
  const start = Date.parse(preview.asOf);
  const boundaries = [...preview.before.batches, ...preview.after.batches].flatMap(b =>
    [b.prepare, b.print, b.waitingRemoval, b.removal].flatMap(i => i ? [Date.parse(i.start), Date.parse(i.end)] : []),
  ).filter(t => t > start);
  return Math.min(Date.parse(preview.expiresAt) - start, ...boundaries.map(t => t - start));
}
export function QueueSimulationPanel({ preview, data, busy, error, expired, ready, uncertain, onRefresh, onCancel, onConfirm }: {
  preview: QueuePreview | null; data: PlanningData; busy: boolean; error: string; expired: boolean; ready: boolean; uncertain: boolean;
  onRefresh: () => void; onCancel: () => void; onConfirm: () => void;
}) {
  return <section aria-label="Simulação da fila" className="min-w-0 rounded-lg border p-4">
    <h2 className="text-lg font-semibold">Simulação da fila</h2>
    <p>Compare os efeitos antes de confirmar. A simulação não reserva capacidade.</p>
    <div role="status" aria-live="polite">
      {busy && <p>Calculando ou confirmando…</p>}
      {error && <Notice>{error}</Notice>}
      {expired && <Notice kind="info">A prévia expirou. Simule novamente para conferir os horários atuais.</Notice>}
    </div>
    {preview && <>
      <p>Referência: {instantLabel(preview.asOf)} · revisão {preview.revision}. Validade máxima: 60 segundos.</p>
      {!preview.impacts.length && <p>Nenhuma alteração nos horários previstos. A sequência proposta ainda pode mudar.</p>}
      <div className="my-3 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Impactos em todas as máquinas">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="text-left font-semibold">Retirada prevista antes e depois · inclui máquinas fora dos filtros</caption>
          <thead><tr><th scope="col">Lote e máquina</th><th scope="col">OPs e linhas afetadas</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead>
          <tbody>{preview.impacts.map(i => <tr key={i.batchId} className="border-t align-top">
            <th scope="row" className="p-2">Lote {data.batches.find(b => b.id === i.batchId)?.sequence ?? i.batchId}<br /><span>{data.printers.find(p => p.id === i.printerId)?.name ?? i.printerId}</span></th>
            <td className="p-2">{i.participants.map(p => <p key={p.id}>OP {p.orderSequence} · {p.description} · {p.units} peças · prazo {p.dueDate ?? "não informado"}</p>)}</td>
            <td className="p-2"><ForecastCell forecast={i.before} /></td><td className="p-2"><ForecastCell forecast={i.after} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="text-sm">A retirada encerra somente a ocupação modelada. Acabamento, inspeção, embalagem e transporte não estão cobertos. Previsão não é garantia de entrega.</p>
    </>}
    <div className="mt-3 flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy && ready} onClick={onCancel}>Descartar simulação</Button>
      <Button variant="outline" disabled={busy} onClick={onRefresh}>{ready ? "Simular novamente" : "Revisar para confirmar"}</Button>
      {ready && <Button disabled={busy || (expired && !uncertain) || (!!error && !uncertain)} onClick={onConfirm}>{uncertain ? "Repetir confirmação" : "Confirmar nova ordem"}</Button>}
    </div>
  </section>;
}

export function QueueSimulationFlow({ data, onDone, children }: {
  data: PlanningData; onDone: () => void;
  children: (state: { propose: (scenario: QueueScenario) => void; busy: boolean }) => ReactNode;
}) {
  const [scenario, setScenario] = useState<QueueScenario | null>(null);
  const [preview, setPreview] = useState<QueuePreview | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [ready, setReady] = useState(false), [uncertain, setUncertain] = useState(false);
  const [deadline, setDeadline] = useState(0), [now, setNow] = useState(0);
  const generation = useRef(0), applying = useRef(false);
  const retry = useRef<{ operationKey: string; expectedRevision: number; expectedVersion: number; printerId: string; batchIds: string[]; previewAsOf: string; previewFingerprint: string } | null>(null);
  useEffect(() => {
    if (!preview) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick); document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [preview]);
  useEffect(() => () => { generation.current++; }, []);
  function cancel() {
    if (applying.current) return;
    generation.current++; setScenario(null); setPreview(null); setError(""); setBusy(false); setReady(false); setUncertain(false); retry.current = null;
  }
  async function request(next: QueueScenario, forConfirmation = false) {
    if (applying.current) return;
    const seq = ++generation.current, started = Date.now();
    setScenario(next); setBusy(true); setError(""); setPreview(null); setReady(false); setUncertain(false); retry.current = null;
    try {
      const result = await api<QueuePreview>("/api/planning/preview", next);
      if (generation.current !== seq) return;
      setPreview(result); setReady(forConfirmation); setDeadline(started + lifetime(result)); setNow(Date.now());
    } catch (e) { if (generation.current === seq) setError((e as Error).message); }
    finally { if (generation.current === seq) setBusy(false); }
  }
  async function confirm() {
    if (!preview || !scenario || !ready || applying.current || (Date.now() >= deadline && !uncertain)) { setNow(Date.now()); return; }
    applying.current = true; setBusy(true); setError("");
    retry.current ??= { operationKey: crypto.randomUUID(), expectedVersion: 0, expectedRevision: preview.revision, ...scenario, previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint };
    try {
      await planningCommand("QUEUE_REORDER", retry.current);
      applying.current = false; cancel(); onDone();
    } catch (e) {
      const network = (e as { code?: string }).code === "NETWORK";
      setUncertain(network); setError(`${(e as Error).message}${network ? " Repita a confirmação para conferir o resultado da mesma operação." : " Atualize e simule novamente."}`);
      if (!network) { retry.current = null; setReady(false); }
    } finally { applying.current = false; setBusy(false); }
  }
  return <div className="flex min-w-0 flex-col gap-4">
    {scenario && <>
      <p>Nova ordem: {scenario.batchIds.map(id => `Lote ${data.batches.find(b => b.id === id)?.sequence ?? id}`).join(" → ")}</p>
      <QueueSimulationPanel data={data} preview={preview} busy={busy} error={error} expired={!!preview && now >= deadline} ready={ready} uncertain={uncertain}
        onCancel={cancel} onRefresh={() => void request(scenario, true)} onConfirm={() => void confirm()} />
    </>}
    {children({ propose: next => { void request(next); }, busy })}
  </div>;
}
