"use client";
import { PlanningIssues } from "./issues";
import { useState } from "react";
import type { Suggestion } from "@/domain/planning/types";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { BatchForm } from "./batch-form";
import { BatchDetail } from "./batch-detail";
import { CalendarForm } from "./calendar-form";
import { Queue } from "./queue";
import { QueueCalendar } from "./queue-calendar";
import { Suggestions } from "./suggestions";
import { states, instantLabel, type PlanningData } from "./shared";
export function PlanningPanel({ initial }: { initial: PlanningData }) {
  const [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState("queue"),
    [id, setId] = useState(""),
    [suggestion, setSuggestion] = useState<Suggestion | undefined>();
  const [presentation, setPresentation] = useState("list");
  const [printer, setPrinter] = useState(""),
    [state, setState] = useState(""),
    [responsible, setResponsible] = useState(""),
    [due, setDue] = useState("");
  async function refresh() {
    setBusy(true);
    try {
      setData(await api<PlanningData>("/api/planning"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const done = () => {
    void refresh();
  };
  const selected = data.batches.find((b) => b.id === id);
  const batches = data.batches.filter(
    (b) =>
      (!printer || b.printerId === printer) &&
      (state ? b.state === state : b.state !== "CANCELED") &&
      b.participants.some(
        (p) =>
          (!responsible || p.responsibleId === responsible) &&
          (!due || (!!p.dueDate && p.dueDate <= due)),
      ),
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Atualizando…" : "Atualizar sem apagar campos"}
        </Button>
        <Button
          onClick={() => {
            setSuggestion(undefined);
            setView("new");
          }}
        >
          Novo lote
        </Button>
        <Button variant="outline" onClick={() => setView("queue")}>
          Fila
        </Button>
        <Button variant="outline" onClick={() => setView("suggestions")}>
          Sugestões
        </Button>
        {data.role === "ADMIN" && (
          <Button variant="outline" onClick={() => setView("calendars")}>
            Horários e padrões
          </Button>
        )}
      </div>
      <p>
        Referência: {instantLabel(data.asOf)} · revisão {data.revision}.
        Horizonte: 90 dias.
      </p>
      {error && <Notice>{error}</Notice>}
      <PlanningIssues issues={data.issues ?? []} onOpenTarget={t => { if(t.kind === "batch") {setId(t.id);setView("detail");} else if(t.kind === "calendar" && data.role === "ADMIN") setView("calendars"); else setError("Solicite a um administrador a configuração dos horários no planejamento."); }} />
      {data.warnings.map((w) => (
        <Notice kind="info" key={w}>
          {w}
        </Notice>
      ))}
      {view === "new" && (
        <BatchForm
          data={data}
          suggestion={suggestion}
          onDone={() => {
            setView("queue");
            done();
          }}
          onCancel={() => setView("queue")}
        />
      )}
      {view === "calendars" && data.role === "ADMIN" && (
        <CalendarForm data={data} onDone={done} />
      )}
      {view === "suggestions" && (
        <Suggestions
          data={data}
          onApply={(s) => {
            setSuggestion(s);
            setView("new");
          }}
        />
      )}
      {view === "detail" && selected && (
        <BatchDetail
          data={data}
          batch={selected}
          onDone={done}
          onClose={() => setView("queue")}
        />
      )}
      {view === "queue" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="field">
              Máquina na fila
              <NativeSelect
                value={printer}
                onChange={(e) => setPrinter(e.target.value)}
              >
                <option value="">Todas</option>
                {data.printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field">
              Estado
              <NativeSelect
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Todos, exceto cancelados</option>
                {Object.entries(states).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="field">
              Responsável
              <NativeSelect
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
              >
                <option value="">Todos</option>
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <Field
              label="Prazo até"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <p>
            Os filtros mudam apenas a exibição. Todas as máquinas continuam
            compartilhando uma pessoa na previsão.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.forecast.totals
              .filter((t) => !printer || t.printerId === printer)
              .map((t) => (
                <p key={t.printerId}>
                  {data.printers.find((p) => p.id === t.printerId)?.name}:{" "}
                  {Math.round(t.printMinutes)} min de impressão ·{" "}
                  {Math.round(t.serviceMinutes)} min de atendimento ·{" "}
                  {Math.round(t.waitingMinutes)} min aguardando retirada ·{" "}
                  {Math.round(t.availableMinutes)} min de disponibilidade.
                </p>
              ))}
          </div>
          <label className="field">
            Visualização da fila
            <NativeSelect value={presentation} onChange={e => setPresentation(e.target.value)}>
              <option value="list">Lista e simulação</option>
              <option value="calendar">Calendário por impressora</option>
            </NativeSelect>
          </label>
          <p>A retirada prevista não inclui acabamento, inspeção, embalagem ou transporte. Previsão não é garantia de entrega.</p>
          {presentation === "calendar" ? <QueueCalendar data={data} batches={batches} onSelect={batchId => { setId(batchId); setView("detail"); }} /> : <Queue
            data={data}
            batches={batches}
            onSelect={(batchId) => {
              setId(batchId);
              setView("detail");
            }}
            onDone={done}
          />}
        </>
      )}
    </div>
  );
}
