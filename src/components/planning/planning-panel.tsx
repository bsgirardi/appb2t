"use client";
import { PlanningIssues } from "./issues";
import { useState } from "react";
import type { Suggestion } from "@/domain/planning/types";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { FilterPanel } from "@/components/admin/filter-panel";
import { FieldGroup } from "@/components/ui/field";
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
    <div className="planning-composition flex min-w-0 flex-col gap-5">
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
        <Button
          variant="outline"
          aria-pressed={view === "queue"}
          onClick={() => setView("queue")}
        >
          Fila
        </Button>
        <Button
          variant="outline"
          aria-pressed={view === "suggestions"}
          onClick={() => setView("suggestions")}
        >
          Sugestões
        </Button>
        {data.role === "ADMIN" && (
          <Button
            variant="outline"
            aria-pressed={view === "calendars"}
            onClick={() => setView("calendars")}
          >
            Horários e padrões
          </Button>
        )}
      </div>
      <p>
        Referência: {instantLabel(data.asOf)} · revisão {data.revision}.
        Horizonte: 90 dias.
      </p>
      {busy && (
        <p role="status" aria-live="polite">
          Atualizando dados; os campos em edição serão mantidos.
        </p>
      )}
      {error && (
        <>
          <Notice>{error}</Notice>
          <p>
            Os dados exibidos continuam na referência acima. Tente atualizar
            novamente.
          </p>
        </>
      )}
      <PlanningIssues
        issues={data.issues ?? []}
        onOpenTarget={(t) => {
          if (t.kind === "batch") {
            setId(t.id);
            setView("detail");
          } else if (t.kind === "calendar" && data.role === "ADMIN")
            setView("calendars");
          else
            setError(
              "Solicite a um administrador a configuração dos horários no planejamento.",
            );
        }}
      />
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
          <FilterPanel
            title="Filtros da fila"
            activeCount={
              [printer, state, responsible, due].filter(Boolean).length
            }
          >
            <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            </FieldGroup>
          </FilterPanel>
          <section aria-label="Seleção da fila" className="planning-selection">
            <h2>
              {batches.length} {batches.length === 1 ? "lote" : "lotes"} na
              seleção
            </h2>
            <dl className="planning-facts">
              <div>
                <dt>Máquina</dt>
                <dd>
                  {data.printers.find((p) => p.id === printer)?.name ?? "Todas"}
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {state
                    ? states[state as keyof typeof states]
                    : "Todos, exceto cancelados"}
                </dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>
                  {data.users.find((u) => u.id === responsible)?.name ??
                    "Todos"}
                </dd>
              </div>
              <div>
                <dt>Prazo até</dt>
                <dd>
                  {due ? due.split("-").reverse().join("/") : "Sem limite"}
                </dd>
              </div>
            </dl>
          </section>
          <p>
            Os filtros mudam apenas a exibição. Todas as máquinas continuam
            compartilhando uma pessoa na previsão.
          </p>
          <section
            aria-label="Disponibilidade e ocupação previstas"
            className="planning-capacity"
          >
            <h2>Disponibilidade e ocupação previstas</h2>
            <p>
              Totais do horizonte de 90 dias por máquina; estado, responsável e
              prazo não reduzem estes totais.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.forecast.totals
                .filter((t) => !printer || t.printerId === printer)
                .map((t) => (
                  <section key={t.printerId}>
                    <h3>
                      {data.printers.find((p) => p.id === t.printerId)?.name}
                    </h3>
                    <dl className="planning-facts">
                      <div>
                        <dt>Impressão</dt>
                        <dd>{Math.round(t.printMinutes)} min</dd>
                      </div>
                      <div>
                        <dt>Atendimento</dt>
                        <dd>{Math.round(t.serviceMinutes)} min</dd>
                      </div>
                      <div>
                        <dt>Aguardando retirada</dt>
                        <dd>{Math.round(t.waitingMinutes)} min</dd>
                      </div>
                      <div>
                        <dt>Disponibilidade</dt>
                        <dd>{Math.round(t.availableMinutes)} min</dd>
                      </div>
                    </dl>
                  </section>
                ))}
            </div>
            {!data.forecast.totals.some(
              (t) => !printer || t.printerId === printer,
            ) && <p>Totais de disponibilidade indisponíveis nesta seleção.</p>}
          </section>
          <label className="field">
            Visualização da fila
            <NativeSelect
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
            >
              <option value="list">Lista e simulação</option>
              <option value="calendar">Calendário por impressora</option>
            </NativeSelect>
          </label>
          <p>
            A retirada prevista não inclui acabamento, inspeção, embalagem ou
            transporte. Previsão não é garantia de entrega.
          </p>
          {presentation === "calendar" ? (
            <QueueCalendar
              data={data}
              batches={batches}
              onSelect={(batchId) => {
                setId(batchId);
                setView("detail");
              }}
            />
          ) : (
            <Queue
              data={data}
              batches={batches}
              onSelect={(batchId) => {
                setId(batchId);
                setView("detail");
              }}
              onDone={done}
            />
          )}
        </>
      )}
    </div>
  );
}
