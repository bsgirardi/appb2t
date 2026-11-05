"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  OpportunityDTO,
  OpportunityEventDTO,
  OpportunityOptions,
  OpportunityQuote,
} from "@/domain/opportunities/types";
import { stageLabels } from "@/domain/opportunities/types";
import { isOpportunityOpen } from "@/domain/opportunities/states";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import type { Page } from "@/domain/shared/pagination";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpportunityForm } from "./form";
import { CommercialForecast } from "@/components/planning/commercial-forecast";
import { OpportunityDecision } from "./decision";
import { useOpportunityCommand, CommandError } from "./command";
const eventLabels: Record<string, string> = {
  CREATE: "Oportunidade criada",
  UPDATE: "Dados atualizados",
  INTERACTION: "Interação registrada",
  LINK_QUOTE: "Orçamento vinculado",
  SET_PRIMARY: "Orçamento principal alterado",
  LOSE: "Perda registrada",
  REOPEN: "Oportunidade reaberta",
  WON: "Venda concluída",
};
export function OpportunityDetail({
  initial,
  initialEvents,
  options,
}: {
  initial: OpportunityDTO;
  initialEvents: Page<OpportunityEventDTO>;
  options: OpportunityOptions;
}) {
  const [o, setOpportunity] = useState(initial),
    [events, setEvents] = useState(initialEvents),
    [editing, setEditing] = useState(false),
    [mode, setMode] = useState<"lose" | "reopen" | null>(null),
    [text, setText] = useState(""),
    [reason, setReason] = useState(""),
    [nextAction, setNextAction] = useState(""),
    [date, setDate] = useState(todaySaoPaulo(new Date())),
    [candidates, setCandidates] = useState<Page<OpportunityQuote> | null>(null),
    [quoteId, setQuoteId] = useState(""),
    [query, setQuery] = useState(""),
    [readError, setReadError] = useState(""),
    [reading, setReading] = useState(false);
  const command = useOpportunityCommand(o.id),
    router = useRouter();
  const open = isOpportunityOpen(o.stage);
  async function loadEvents(page: number) {
    setReading(true);
    setReadError("");
    try {
      setEvents(
        await api<Page<OpportunityEventDTO>>(
          `/api/opportunities/${o.id}/events?page=${page}`,
        ),
      );
    } catch (e) {
      setReadError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  async function accepted(value: OpportunityDTO) {
    setOpportunity(value);
    setEditing(false);
    setMode(null);
    await loadEvents(1);
    router.refresh();
  }
  async function run(payload: Record<string, unknown>) {
    const result = await command.run({
      ...payload,
      expectedVersion: o.version,
    });
    if (result) await accepted(result);
    return result;
  }
  async function interaction(e: FormEvent) {
    e.preventDefault();
    if (await run({ action: "INTERACTION", text })) setText("");
  }
  async function close(e: FormEvent) {
    e.preventDefault();
    if (
      await run(
        mode === "lose"
          ? { action: "LOSE", reason }
          : { action: "REOPEN", reason, nextAction, nextContactDate: date },
      )
    )
      setReason("");
  }
  async function searchQuotes(page = 1) {
    setReading(true);
    setReadError("");
    try {
      setCandidates(
        await api<Page<OpportunityQuote>>(
          `/api/opportunities/quote-candidates?${new URLSearchParams({ opportunityId: o.id, search: query, page: String(page) })}`,
        ),
      );
      setQuoteId("");
    } catch (e) {
      setReadError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-5 break-words">
      <Link href="/negociacoes">← Negociações</Link>
      <header className="flex flex-col gap-2">
        <h1>{o.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{stageLabels[o.stage]}</Badge>
          <span>
            {o.customer.name} · {o.owner.name}
          </span>
        </div>
      </header>
      {!o.owner.active ? (
        <Notice kind="info">
          Responsável inativo. Reatribua a oportunidade ao editar quando ela
          estiver aberta.
        </Notice>
      ) : null}
      {!o.customer.active ? (
        <Notice kind="info">
          Cliente inativo. O cadastro continua preservado; revise antes de
          converter o orçamento.
        </Notice>
      ) : null}
      <CommandError {...command} />
      <CommercialForecast opportunityId={o.id} opportunityVersion={o.version} principalQuote={o.quotes.find(q => q.id === o.principalQuoteId) ?? null} wonSale={o.wonSale} />
      <OpportunityDecision
        quote={o.quotes.find((q) => q.id === o.principalQuoteId) ?? null}
      />
      {readError ? <Notice>{readError}</Notice> : null}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar oportunidade</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityForm
              initial={o}
              options={options}
              onSaved={(value) => {
                void accepted(value);
              }}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Próxima ação</CardTitle>
            <CardDescription>Data de contato em São Paulo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p>{o.nextAction ?? "Oportunidade encerrada"}</p>
            {o.nextContactDate ? (
              <p>
                {o.nextContactDate.split("-").reverse().join("/")}
                {o.nextContactDate < todaySaoPaulo(new Date())
                  ? " · Atrasada"
                  : ""}
              </p>
            ) : null}
            <h2>Pendências</h2>
            <p className="whitespace-pre-wrap">
              {o.pendingNotes || "Nenhuma pendência registrada."}
            </p>
            <div className="flex flex-wrap gap-2">
              {open ? (
                <>
                  <Button
                    variant="outline"
                    disabled={command.busy}
                    onClick={() => setEditing(true)}
                  >
                    Editar oportunidade
                  </Button>
                  <Button
                    variant="outline"
                    disabled={command.busy}
                    onClick={() => setMode("lose")}
                  >
                    Registrar perda
                  </Button>
                </>
              ) : null}
              {o.stage === "PERDIDO" ? (
                <Button
                  variant="outline"
                  disabled={command.busy}
                  onClick={() => setMode("reopen")}
                >
                  Reabrir oportunidade
                </Button>
              ) : null}
            </div>
            {o.lossReason ? <p>Motivo da perda: {o.lossReason}</p> : null}
          </CardContent>
        </Card>
      )}
      {mode ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "lose" ? "Registrar perda" : "Reabrir oportunidade"}
            </CardTitle>
            <CardDescription>
              {mode === "lose"
                ? "Orçamentos e ofertas não serão cancelados. Retire qualquer oferta privada ativa pelo atendimento antes de continuar."
                : "A oportunidade volta para levantamento com uma nova próxima ação."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={close} className="flex flex-col gap-3">
              <FieldGroup>
                <Field
                  label="Motivo"
                  required
                  minLength={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {mode === "reopen" ? (
                  <>
                    <Field
                      label="Nova próxima ação"
                      required
                      maxLength={500}
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                    />
                    <Field
                      label="Nova data de contato"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </>
                ) : null}
              </FieldGroup>
              <div className="flex flex-wrap gap-2">
                <Button disabled={command.busy}>
                  {mode === "lose" ? "Confirmar perda" : "Confirmar reabertura"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode(null)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {o.wonSale ? (
        <Card>
          <CardHeader>
            <CardTitle>Venda vinculada</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/vendas/${o.wonSale.id}`}>{o.wonSale.number}</Link>
            {o.wonSale.status === "CANCELADA" ? (
              <Notice kind="info">
                A venda foi cancelada. A oportunidade mantém o histórico de
                ganho.
              </Notice>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos</CardTitle>
          <CardDescription>
            Versão atual de cada documento. Edições anteriores completas ainda
            não estão disponíveis neste acompanhamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {o.quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/orcamentos/${q.id}`}>{q.number}</Link>
                <span>
                  Versão {q.version} · {q.status}
                </span>
                {o.principalQuoteId === q.id ? (
                  <Badge variant="outline">Principal</Badge>
                ) : open ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={command.busy}
                    onClick={() => {
                      void run({ action: "SET_PRIMARY", quoteId: q.id });
                    }}
                  >
                    Tornar principal {q.number}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {!o.quotes.length ? <p>Nenhum orçamento vinculado.</p> : null}
          {open ? (
            <>
              <Link href="/orcamentos">
                Criar orçamento na tela de orçamentos
              </Link>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void searchQuotes();
                }}
                className="flex flex-col gap-2"
              >
                <FieldGroup>
                  <Field
                    label="Buscar orçamento por número"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ORC-000001"
                  />
                </FieldGroup>
                <Button variant="outline" disabled={reading}>
                  Buscar orçamentos do cliente
                </Button>
              </form>
              {candidates ? (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="op-quote">Orçamento para vincular</Label>
                  <NativeSelect
                    id="op-quote"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                  >
                    <option value="">Selecione um orçamento</option>
                    {candidates.items.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.number} · {q.status}
                      </option>
                    ))}
                  </NativeSelect>
                  {!candidates.items.length ? (
                    <p>Nenhum orçamento elegível.</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!quoteId || command.busy}
                      onClick={() => {
                        void run({ action: "LINK_QUOTE", quoteId }).then(
                          (result) => {
                            if (result) {
                              setCandidates(null);
                              setQuoteId("");
                            }
                          },
                        );
                      }}
                    >
                      Vincular orçamento
                    </Button>
                    {candidates.page > 1 ? (
                      <Button
                        variant="outline"
                        disabled={reading}
                        onClick={() => {
                          void searchQuotes(candidates.page - 1);
                        }}
                      >
                        Orçamentos anteriores
                      </Button>
                    ) : null}
                    {candidates.page * candidates.pageSize <
                    candidates.total ? (
                      <Button
                        variant="outline"
                        disabled={reading}
                        onClick={() => {
                          void searchQuotes(candidates.page + 1);
                        }}
                      >
                        Mais orçamentos
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Interações internas</CardTitle>
          <CardDescription>
            Este registro não envia mensagens ao cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={interaction} className="flex flex-col gap-3">
            <FieldGroup>
              <div data-slot="field">
                <Label htmlFor="op-interaction">Registrar interação</Label>
                <Textarea
                  id="op-interaction"
                  required
                  maxLength={4000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </FieldGroup>
            <Button disabled={command.busy}>Salvar interação</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico da oportunidade</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ol className="flex flex-col gap-4">
            {events.items.map((event) => (
              <li key={event.id}>
                <p>
                  <strong>{eventLabels[event.type] ?? "Registro"}</strong> ·{" "}
                  {event.actorName} ·{" "}
                  {new Date(event.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
                <EventDetails event={event} />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {events.page > 1 ? (
              <Button
                variant="outline"
                disabled={reading}
                onClick={() => {
                  void loadEvents(events.page - 1);
                }}
              >
                Histórico anterior
              </Button>
            ) : null}
            <span>Página {events.page}</span>
            {events.page * events.pageSize < events.total ? (
              <Button
                variant="outline"
                disabled={reading}
                onClick={() => {
                  void loadEvents(events.page + 1);
                }}
              >
                Mais registros
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function EventDetails({ event }: { event: OpportunityEventDTO }) {
  const before = event.data.before as Record<string, unknown> | null,
    after = event.data.after as Record<string, unknown> | null;
  const labels: Record<string, string> = {
    title: "Título",
    customerName: "Cliente",
    ownerName: "Responsável",
    stage: "Etapa",
    nextAction: "Próxima ação",
    nextContactDate: "Data do contato",
    pendingNotes: "Pendências",
    lossReason: "Motivo da perda",
  };
  const display = (value: unknown) =>
    typeof value === "string"
      ? (stageLabels[value as keyof typeof stageLabels] ?? value)
      : "—";
  return (
    <div className="flex flex-col gap-1 whitespace-pre-wrap">
      {typeof event.data.text === "string" ? <p>{event.data.text}</p> : null}
      {typeof event.data.reason === "string" ? (
        <p>{event.data.reason}</p>
      ) : null}
      {after
        ? Object.entries(labels)
            .filter(([key]) => before?.[key] !== after[key])
            .map(([key, label]) => (
              <p key={key}>
                {label}: {before ? `${display(before[key])} → ` : ""}
                {display(after[key])}
              </p>
            ))
        : null}
      {event.type === "LINK_QUOTE" && after?.stage === "GANHO" ? (
        <p>Venda existente vinculada; ganho reconciliado sem nova conversão.</p>
      ) : null}
    </div>
  );
}
