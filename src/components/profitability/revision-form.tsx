"use client";
import {
  useRef,
  useState,
  useSyncExternalStore,
  useCallback,
  type FormEvent,
} from "react";
import type {
  AdministrativePayload,
  DeclaredAmount,
  RevisionInput,
  RevisionDTO,
  SaleProfitabilityDTO,
  ExtraConfirmation,
} from "@/domain/profitability/types";
import { api, ApiError } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
type Channel = { id: string; name: string; version: number };
type Props = {
  value: SaleProfitabilityDTO;
  actorId: string;
  channels: Channel[];
  onDone?: () => void;
};
type Draft = {
  version: number;
  payload: AdministrativePayload;
  reason: string;
  effectiveDate: string;
};
type Saved = {
  draft: Draft;
  pending: RevisionInput | null;
  expires: number;
  base?: AdministrativePayload;
};
const fieldNames: Record<keyof AdministrativePayload, string> = {
  channel: "Canal",
  expectedShipping: "Frete previsto",
  fees: "Encargos",
  shipping: "Frete efetivo",
  extras: "Complementos",
  confirmations: "Conferências de extras",
  lineReviews: "Conferências de linhas",
  commercialPending: "Pendência comercial",
  commercialReason: "Motivo da pendência",
};
function describe(value: unknown): string {
  if (value == null) return "não informado";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (Array.isArray(value))
    return value.length ? value.map(describe).join("; ") : "nenhum";
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (v.state)
      return v.state === "UNKNOWN" ? "desconhecido" : `R$ ${v.value}`;
    if (v.name) return String(v.name);
    return [
      v.description,
      v.reference,
      v.value != null ? `R$ ${v.value}` : null,
      v.reason,
      v.lineKey ? `linha ${v.lineKey}` : null,
      v.complete != null ? (v.complete ? "conferida" : "não conferida") : null,
      v.kind === "COMPLEMENT"
        ? "vinculado a complemento"
        : v.kind === "U3_SOURCE"
          ? "vinculado à produção"
          : v.kind === "NOT_OCCURRED"
            ? "não ocorreu"
            : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return String(value) || "vazio";
}
const subscribe = () => () => {};
const blank = (): AdministrativePayload => ({
  channel: null,
  expectedShipping: { state: "UNKNOWN" },
  fees: { state: "UNKNOWN" },
  shipping: { state: "UNKNOWN" },
  extras: [],
  confirmations: [],
  lineReviews: [],
  commercialPending: false,
  commercialReason: "",
});
function Amount({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DeclaredAmount;
  onChange: (v: DeclaredAmount) => void;
}) {
  return (
    <Field
      label={label}
      inputMode="decimal"
      value={value.state === "DECLARED" ? value.value : ""}
      onChange={(e) =>
        onChange(
          e.target.value.trim() === ""
            ? { state: "UNKNOWN" }
            : { state: "DECLARED", value: e.target.value.replace(",", ".") },
        )
      }
      hint="Vazio = desconhecido. Digite 0 para declarar ausência de custo."
    />
  );
}
export function RevisionForm(props: Props) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? (
    <DraftForm {...props} />
  ) : (
    <Skeleton className="h-32 w-full" aria-label="Carregando conferência" />
  );
}
function DraftForm({ value, actorId, channels, onDone }: Props) {
  const storageKey = `b2t:profitability:${actorId}:${value.saleId}`;
  const [initial] = useState<Saved>(() => {
    try {
      const old = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as Saved | null;
      if (old && old.expires > Date.now() && old.draft?.payload) return old;
    } catch {}
    return {
      draft: {
        version: value.revision?.version ?? 0,
        payload: value.administrative ?? blank(),
        reason: "",
        effectiveDate: todaySaoPaulo(new Date()),
      },
      pending: null,
      base: value.administrative ?? blank(),
      expires: Date.now() + 7200000,
    };
  });
  const [draft, setDraft] = useState(initial.draft),
    current = useRef(initial.draft),
    pending = useRef<RevisionInput | null>(initial.pending);
  const [uncertain, setUncertain] = useState(!!initial.pending),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const sending = useRef(false);
  const base = useRef(initial.base);
  const [rebase, setRebase] = useState<{
    live: AdministrativePayload;
    merged: AdministrativePayload;
    version: number;
    conflicts: (keyof AdministrativePayload)[];
  } | null>(null);
  const persist = useCallback(
    (d: Draft) => {
      current.current = d;
      setDraft(d);
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            draft: d,
            pending: pending.current,
            base: base.current,
            expires: Date.now() + 7200000,
          }),
        );
      } catch {
        /* Editing remains available when browser storage is disabled. */
      }
    },
    [storageKey],
  );
  function update(p: Partial<AdministrativePayload>) {
    persist({
      ...current.current,
      payload: { ...current.current.payload, ...p },
    });
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (sending.current || rebase) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    if (!pending.current)
      pending.current = {
        saleId: value.saleId,
        expectedVersion: current.current.version,
        operationKey: crypto.randomUUID(),
        effectiveDate: current.current.effectiveDate,
        reason: current.current.reason,
        payload: structuredClone(current.current.payload),
      };
    persist(current.current);
    try {
      const saved = await api<RevisionDTO>(
        "/api/profitability/revisions",
        pending.current,
      );
      base.current = saved.payload ?? pending.current.payload;
      pending.current = null;
      setUncertain(false);
      persist({ ...current.current, version: saved.version });
      setSuccess(
        "Conferência salva. As edições posteriores continuam no formulário.",
      );
      onDone?.();
    } catch (err) {
      const ambiguous =
        !(err instanceof ApiError) ||
        ["NETWORK", "INTERNAL"].includes(err.code);
      if (!ambiguous) pending.current = null;
      setUncertain(ambiguous);
      setError((err as Error).message);
      persist(current.current);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function refreshVersion() {
    try {
      const live = await api<SaleProfitabilityDTO>(
        `/api/profitability/sales/${value.saleId}`,
      );
      const remote = live.administrative ?? blank();
      const merged = { ...remote };
      const conflicts: (keyof AdministrativePayload)[] = [];
      const equal = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b);
      for (const key of Object.keys(
        remote,
      ) as (keyof AdministrativePayload)[]) {
        const local = current.current.payload[key];
        if (!base.current || !equal(local, base.current[key])) {
          if (
            (!base.current || !equal(remote[key], base.current[key])) &&
            !equal(local, remote[key])
          )
            conflicts.push(key);
          Object.assign(merged, { [key]: local });
        }
      }
      const version = live.revision?.version ?? 0;
      if (conflicts.length)
        setRebase({ live: remote, merged, version, conflicts });
      else {
        base.current = remote;
        persist({ ...current.current, payload: merged, version });
      }
      setError(
        conflicts.length
          ? "Há alterações conflitantes. Escolha quais valores preservar antes de salvar."
          : "Versão atualizada. Alterações de outros administradores foram preservadas. Confira antes de salvar.",
      );
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function resolveRebase(useLocal: boolean) {
    if (!rebase) return;
    const payload = { ...rebase.merged };
    if (!useLocal)
      for (const key of rebase.conflicts)
        Object.assign(payload, { [key]: rebase.live[key] });
    base.current = rebase.live;
    persist({ ...current.current, payload, version: rebase.version });
    setRebase(null);
    setError("Conflitos resolvidos. Confira os valores antes de salvar.");
  }
  function confirmation(lineKey: string, extraKey: string, selection: string) {
    const next = draft.payload.confirmations.filter(
      (c) => c.lineKey !== lineKey || c.extraKey !== extraKey,
    );
    let c: ExtraConfirmation | undefined;
    if (selection === "NOT_OCCURRED")
      c = { lineKey, extraKey, kind: "NOT_OCCURRED", reason: "" };
    if (selection.startsWith("source:"))
      c = {
        lineKey,
        extraKey,
        kind: "U3_SOURCE",
        sourceId: selection.slice(7),
        value: "0",
      };
    if (selection.startsWith("extra:"))
      c = {
        lineKey,
        extraKey,
        kind: "COMPLEMENT",
        complementId: selection.slice(6),
      };
    update({ confirmations: c ? [...next, c] : next });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conferência administrativa</CardTitle>
        <CardDescription>
          Complementa a rentabilidade sem gerar pagamento, cobrança ou movimento
          de estoque.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={send} className="flex flex-col gap-4">
          {error ? <Notice>{error}</Notice> : null}
          {success ? <Notice kind="success">{success}</Notice> : null}
          {rebase ? (
            <Notice>
              {rebase.conflicts.map((key) => (
                <p key={key}>
                  {fieldNames[key]}: sua edição {describe(rebase.merged[key])};
                  versão atual {describe(rebase.live[key])}.
                </p>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => resolveRebase(true)}>
                  Manter minhas alterações nos conflitos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resolveRebase(false)}
                >
                  Usar valores atuais nos conflitos
                </Button>
              </div>
            </Notice>
          ) : null}
          {uncertain ? (
            <Notice kind="info">
              A resposta não foi confirmada. Recuperaremos a tentativa original
              antes de enviar as edições posteriores.
            </Notice>
          ) : null}
          <fieldset
            disabled={busy || !!rebase}
            className="flex min-w-0 flex-col gap-4"
          >
            <legend>Valores e canal efetivo</legend>
            <Label className="field">
              Canal efetivo
              <NativeSelect
                value={draft.payload.channel?.id ?? ""}
                onChange={(e) =>
                  update({
                    channel:
                      channels.find((c) => c.id === e.target.value) ?? null,
                  })
                }
              >
                <option value="">Não informado</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Amount
              label="Frete previsto (R$)"
              value={draft.payload.expectedShipping}
              onChange={(v) => update({ expectedShipping: v })}
            />
            <Amount
              label="Encargos efetivos (R$)"
              value={draft.payload.fees}
              onChange={(v) => update({ fees: v })}
            />
            <Amount
              label="Frete efetivo (R$)"
              value={draft.payload.shipping}
              onChange={(v) => update({ shipping: v })}
            />
            {value.lines.map((l) => (
              <fieldset key={l.key} className="flex min-w-0 flex-col gap-3">
                <legend>{l.description} — extras</legend>
                {draft.payload.extras
                  .filter((x) => x.lineKey === l.key)
                  .map((x) => (
                    <fieldset
                      key={x.id}
                      className="flex min-w-0 flex-col gap-2"
                    >
                      <legend>Complemento efetivo</legend>
                      {(
                        [
                          "reference",
                          "description",
                          "value",
                          "effectiveDate",
                        ] as const
                      ).map((k) => (
                        <Field
                          key={k}
                          label={
                            {
                              reference: "Documento / referência exclusiva",
                              description: "Descrição do complemento",
                              value: "Custo complementar (R$)",
                              effectiveDate: "Data do complemento",
                            }[k]
                          }
                          type={k === "effectiveDate" ? "date" : "text"}
                          required
                          value={x[k]}
                          onChange={(e) =>
                            update({
                              extras: draft.payload.extras.map((v) =>
                                v.id === x.id
                                  ? { ...v, [k]: e.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      ))}
                      <p>
                        Ao salvar, confirmo que este complemento não está
                        incluído nos custos de produção.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          update({
                            extras: draft.payload.extras.filter(
                              (e) => e.id !== x.id,
                            ),
                            confirmations: draft.payload.confirmations.filter(
                              (c) =>
                                c.kind !== "COMPLEMENT" ||
                                c.complementId !== x.id,
                            ),
                          })
                        }
                      >
                        Remover complemento
                      </Button>
                    </fieldset>
                  ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update({
                      extras: [
                        ...draft.payload.extras,
                        {
                          id: crypto.randomUUID(),
                          lineKey: l.key,
                          reference: "",
                          description: "",
                          value: "",
                          effectiveDate: draft.effectiveDate,
                          notInProduction: true,
                        },
                      ],
                    })
                  }
                >
                  Adicionar complemento para {l.description}
                </Button>
                {(l.expected?.extras ?? []).map((x) => {
                  const c = draft.payload.confirmations.find(
                    (c) => c.lineKey === l.key && c.extraKey === x.key,
                  );
                  const selected =
                    c?.kind === "NOT_OCCURRED"
                      ? "NOT_OCCURRED"
                      : c?.kind === "COMPLEMENT"
                        ? `extra:${c.complementId}`
                        : c?.kind === "U3_SOURCE"
                          ? `source:${c.sourceId}`
                          : "";
                  return (
                    <fieldset
                      key={x.key}
                      className="flex min-w-0 flex-col gap-2"
                    >
                      <legend>{x.name} — previsto</legend>
                      <Label className="field">
                        Tratamento de {x.name}
                        <NativeSelect
                          value={selected}
                          onChange={(e) =>
                            confirmation(l.key, x.key, e.target.value)
                          }
                        >
                          <option value="">Ainda não conferido</option>
                          <option value="NOT_OCCURRED">
                            Não ocorreu — justificar
                          </option>
                          {l.actual.sources
                            .filter(
                              (s) => s.kind === "DELIVERED" && s.value !== null,
                            )
                            .map((s) => (
                              <option key={s.id} value={`source:${s.id}`}>
                                Incluído na produção: {s.label} (
                                {s.id.slice(-6)})
                              </option>
                            ))}
                          {draft.payload.extras
                            .filter((e) => e.lineKey === l.key)
                            .map((e) => (
                              <option key={e.id} value={`extra:${e.id}`}>
                                Complemento: {e.description || e.reference}
                              </option>
                            ))}
                        </NativeSelect>
                      </Label>
                      {c?.kind === "NOT_OCCURRED" ? (
                        <Field
                          label={`Justificativa: ${x.name}`}
                          required
                          minLength={3}
                          value={c.reason}
                          onChange={(e) =>
                            update({
                              confirmations: draft.payload.confirmations.map(
                                (v) =>
                                  v === c
                                    ? { ...c, reason: e.target.value }
                                    : v,
                              ),
                            })
                          }
                        />
                      ) : null}
                      {c?.kind === "U3_SOURCE" ? (
                        <Field
                          label={`Parcela produtiva: ${x.name} (R$)`}
                          required
                          value={c.value}
                          onChange={(e) =>
                            update({
                              confirmations: draft.payload.confirmations.map(
                                (v) =>
                                  v === c ? { ...c, value: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      ) : null}
                    </fieldset>
                  );
                })}
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.payload.lineReviews.some(
                      (r) =>
                        r.lineKey === l.key &&
                        r.complete &&
                        r.sourceHash === l.sourceHash,
                    )}
                    onChange={(e) =>
                      update({
                        lineReviews: [
                          ...draft.payload.lineReviews.filter(
                            (r) => r.lineKey !== l.key,
                          ),
                          {
                            lineKey: l.key,
                            sourceHash: l.sourceHash,
                            complete: e.target.checked,
                          },
                        ],
                      })
                    }
                  />
                  Conferi os extras de {l.description}, incluindo os que não se
                  aplicam
                </Label>
              </fieldset>
            ))}
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.payload.commercialPending}
                onChange={(e) =>
                  update({ commercialPending: e.target.checked })
                }
              />
              Pendência comercial/devolução — excluir dos indicadores normais
            </Label>
            <Field
              label="Motivo da pendência ou resolução"
              value={draft.payload.commercialReason}
              required={draft.payload.commercialPending}
              onChange={(e) => update({ commercialReason: e.target.value })}
            />
            <Field
              label="Data efetiva"
              type="date"
              required
              value={draft.effectiveDate}
              onChange={(e) =>
                persist({ ...draft, effectiveDate: e.target.value })
              }
            />
            <Field
              label="Justificativa"
              required
              minLength={3}
              value={draft.reason}
              onChange={(e) => persist({ ...draft, reason: e.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || !!rebase}>
                {busy
                  ? "Salvando…"
                  : uncertain
                    ? "Recuperar tentativa"
                    : "Salvar conferência"}
              </Button>
              {!uncertain ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={refreshVersion}
                >
                  Atualizar versão sem perder edições
                </Button>
              ) : null}
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
