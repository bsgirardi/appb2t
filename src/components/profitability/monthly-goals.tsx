"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { MonthlyGoalDTO } from "@/server/profitability/monthly-goals";
import { z } from "zod";
import {
  goalValuesSchema,
  monthlyPerformance,
  type GoalValues,
} from "@/domain/profitability/monthly-goals";
import type { GoalMetric } from "@/domain/profitability/intelligence";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  Notice,
  TextareaField,
} from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { moneyText } from "./format";

const labels = {
  revenue: "Faturamento",
  contribution: "Contribuição realizada",
  orders: "Pedidos",
};
const metrics = ["revenue", "contribution", "orders"] as const;
const draftSchema = z.object({
  version: z.number().int().min(0),
  reason: z.string().max(1000),
  values: z.object({
    revenue: z.string().max(30),
    contribution: z.string().max(30),
    orders: z.string().max(30),
  }),
});
const inputs = (v: GoalValues) => ({
  revenue: v.revenue ?? "",
  contribution: v.contribution ?? "",
  orders: v.orders ?? "",
});
const valueText = (
  key: GoalMetric,
  value: string | null,
  missing = "Indisponível",
) =>
  value === null
    ? missing
    : key === "orders"
      ? `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pedidos`
      : moneyText(value);
const dateText = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(v));

export function MonthlyGoals({ initial }: { initial: MonthlyGoalDTO }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(inputs(initial.values));
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftVersion, setDraftVersion] = useState(initial.version);
  const draftKey = `b2t-monthly-goal:${initial.editorId}:${initial.month}`;
  const rawValues = Object.fromEntries(
    metrics.map((k) => [k, draft[k] === "" ? null : draft[k]]),
  );
  const parsed = goalValuesSchema.safeParse(rawValues);
  const dirty =
    reason !== "" ||
    !parsed.success ||
    JSON.stringify(parsed.data) !== JSON.stringify(saved.values);
  /* Browser storage is an external source hydrated after SSR. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Hydrate from browser storage only after SSR; also restores Back/Forward drafts.
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const recovered = draftSchema.safeParse(JSON.parse(raw));
        if (recovered.success) {
          setDraft(recovered.data.values);
          setReason(recovered.data.reason);
          setDraftVersion(recovered.data.version);
          setConflicted(recovered.data.version !== initial.version);
          setMessage(
            "Rascunho recuperado nesta aba. Confira as metas salvas e revise antes de gravar.",
          );
        }
      }
    } catch {
      /* Storage can be disabled; ordinary exit protection stays available. */
    }
    setDraftLoaded(true);
  }, [draftKey, initial.version]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (dirty)
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ version: draftVersion, values: draft, reason }),
        );
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* Exit confirmation still protects edits when storage is unavailable. */
    }
  }, [draftLoaded, dirty, draftKey, draftVersion, draft, reason]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.("a[href]");
      if (
        anchor &&
        (busy ||
          !window.confirm(
            "Há alterações não salvas. Deseja sair desta página?",
          ))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, busy]);
  async function loadCurrent() {
    const response = await fetch(
      `/api/profitability/goals?month=${saved.month}`,
      { cache: "no-store" },
    );
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        body.error?.message ?? "Não foi possível consultar a versão atual.",
      );
    return body.data as MonthlyGoalDTO;
  }
  async function refresh() {
    setBusy(true);
    try {
      const current = await loadCurrent();
      setSaved(current);
      setDraftVersion(current.version);
      setConflicted(false);
      setReview(false);
      setFailed(false);
      setMessage(
        "Versão atual consultada. Seus campos foram preservados: compare com as metas salvas e revise novamente antes de gravar.",
      );
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Falha na consulta.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!parsed.success || busy || conflicted) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/profitability/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month: saved.month,
          version: draftVersion,
          values: parsed.data,
          reason,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflicted(true);
        setFields(body.error?.fields ?? {});
        throw new Error(body.error?.message ?? "Não foi possível salvar.");
      }
      const next = {
        ...saved,
        version: body.data.version,
        values: body.data.values as GoalValues,
        performance: monthlyPerformance(
          saved.summary,
          body.data.values,
          saved.period,
        ),
      };
      setSaved(next);
      setDraftVersion(next.version);
      setDraft(inputs(next.values));
      setReason("");
      setReview(false);
      setFailed(false);
      try {
        const current = await loadCurrent();
        setSaved(current);
        if (current.version !== next.version) {
          setConflicted(true);
          setMessage(
            "Sua revisão foi salva, mas outra revisão já está disponível. Consulte a versão atual e confira os valores antes de editar novamente.",
          );
        } else {
          setMessage("Revisão salva. Histórico e realizado atualizados.");
        }
      } catch {
        setMessage(
          "Revisão salva. Atualize a página para consultar o histórico e o realizado mais recentes.",
        );
      }
    } catch (e) {
      setFailed(true);
      setMessage(
        e instanceof Error
          ? e.message
          : "Falha ao salvar. Consulte a versão atual antes de repetir se houver dúvida sobre a gravação.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profitability-reading flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Metas mensais</CardTitle>
          <CardDescription>
            Metas globais da operação · competência em America/Sao_Paulo ·
            edição por administradores
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-wrap items-end gap-3"
            action="/rentabilidade/metas"
            onSubmit={(e) => {
              if (
                busy ||
                (dirty &&
                  !window.confirm(
                    "Trocar de competência e descartar alterações não salvas?",
                  ))
              )
                e.preventDefault();
            }}
          >
            <Field
              label="Competência"
              name="month"
              type="month"
              min="1900-01"
              max="9999-12"
              defaultValue={saved.month}
              required
            />
            <Button disabled={busy}>Consultar mês</Button>
          </form>
          <p>
            Período: {saved.period.from} a {saved.period.end}.{" "}
            {saved.period.state === "future"
              ? "Mês futuro: realizado ainda indisponível."
              : saved.period.state === "closed"
                ? "Mês encerrado; leitura atualizada das fontes."
                : `Mês em andamento, apurado até ${saved.period.to}; hoje ainda parcial.`}
          </p>
          <Notice kind="info">
            Mesma apuração da Rentabilidade: vendas normais pela primeira
            confirmação, sem filtros de produto, canal ou cobertura. Pedidos sem
            confirmação datada e cancelados ficam fora. Faturamento não é
            recebimento; contribuição não é lucro líquido. Custos ou correções
            posteriores atualizam inclusive meses encerrados. O histórico
            preserva as metas, sem congelar o realizado.
          </Notice>
          <p>
            Cobertura da contribuição: {saved.summary.actual.count}/
            {saved.summary.count} pedidos · subtotal coberto{" "}
            {moneyText(saved.summary.actual.value)}. Sem cobertura integral,
            contribuição e progresso permanecem indisponíveis.
          </p>
          <p>
            Consulta iniciada em {dateText(saved.readAt)} (São Paulo).{" "}
            <Link
              href={`/rentabilidade?from=${saved.period.from}&to=${saved.period.to}`}
            >
              Conferir pedidos e fontes no relatório
            </Link>
          </p>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        {metrics.map((key) => {
          const m = saved.performance[key];
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{labels[key]}</CardTitle>
                <CardDescription>
                  Meta salva: {valueText(key, m.target, "Não definida")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p>
                  Realizado: <strong>{valueText(key, m.actual)}</strong>
                </p>
                <p>
                  Progresso:{" "}
                  {m.progress === null
                    ? m.target === "0.00" || m.target === "0"
                      ? "Meta zero — sem percentual"
                      : m.target === null
                        ? "Meta não definida — sem percentual"
                        : "Realizado indisponível — confira o período e a cobertura"
                    : `${Number(m.progress).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`}
                </p>
                {m.progress !== null && (
                  <progress
                    className="w-full"
                    aria-label={`Progresso: ${labels[key]}`}
                    max={100}
                    value={Math.min(100, Math.max(0, Number(m.progress)))}
                  />
                )}
                <p>Estimativa ao fim do mês: {valueText(key, m.projection)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Notice kind="info">
        Estimativa por dias corridos: realizado ÷ {saved.period.elapsed} dias
        decorridos × {saved.period.days} dias do mês. Disponível apenas no mês
        corrente; inclui hoje parcial. Supõe ritmo constante, sem garantia de
        demanda, capacidade ou resultado. Pedidos fracionários são média
        estatística. Metas e projeções não criam vendas, reservas, recebimentos
        ou compromissos de produção.
      </Notice>
      <Card>
        <CardHeader>
          <CardTitle>Revisar metas da competência {saved.month}</CardTitle>
          <CardDescription>
            Versão salva: {saved.version}. Campo vazio remove a meta; zero
            define meta zero. Nenhum valor comercial é preenchido
            automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!parsed.success) {
                setFields(
                  Object.fromEntries(
                    parsed.error.issues.map((i) => [
                      i.path.join("."),
                      i.message,
                    ]),
                  ),
                );
                return;
              }
              if (reason.trim().length < 3) {
                setFields({
                  reason: "Explique o motivo com pelo menos 3 caracteres.",
                });
                return;
              }
              setFields({});
              setReview(true);
            }}
          >
            <FieldGroup>
              {metrics.map((key) => (
                <Field
                  key={key}
                  label={
                    key === "revenue"
                      ? "Meta de faturamento (R$)"
                      : key === "contribution"
                        ? "Meta de contribuição (R$)"
                        : "Meta de pedidos (unidades)"
                  }
                  type="number"
                  min="0"
                  step={key === "orders" ? "1" : "0.01"}
                  value={draft[key]}
                  disabled={busy}
                  error={fields[key] ?? fields[`values.${key}`]}
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                    setReview(false);
                  }}
                  hint={
                    key === "orders"
                      ? "Pedidos inteiros; vazio = não definida."
                      : "Até duas casas decimais; vazio = não definida."
                  }
                />
              ))}
              <TextareaField
                label="Motivo da revisão"
                value={reason}
                required
                minLength={3}
                maxLength={1000}
                disabled={busy}
                error={fields.reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReview(false);
                }}
              />
            </FieldGroup>
            {message && (
              <Notice kind={failed ? "error" : "success"}>{message}</Notice>
            )}
            {conflicted && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={refresh}
              >
                Consultar versão atual
              </Button>
            )}
            {review && parsed.success && (
              <div
                className="flex flex-col gap-2"
                role="region"
                aria-label="Resumo da revisão"
              >
                <p>
                  Confira a revisão para {saved.month}, sobre a versão{" "}
                  {saved.version}:
                </p>
                {metrics.map((key) => (
                  <p key={key}>
                    {labels[key]}:{" "}
                    {valueText(key, saved.values[key], "Não definida")} →{" "}
                    {valueText(key, parsed.data[key], "Não definida")}
                  </p>
                ))}
                <p>Motivo: {reason}</p>
                <Button
                  type="button"
                  disabled={busy || conflicted}
                  onClick={save}
                >
                  {busy ? "Salvando…" : "Confirmar e salvar revisão"}
                </Button>
              </div>
            )}
            <Button
              type="submit"
              variant="outline"
              disabled={busy || conflicted || !dirty}
            >
              Revisar metas
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de revisões de {saved.month}</CardTitle>
          <CardDescription>
            {saved.history.total} revisões. Valores anteriores, motivo, autor e
            data preservados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3">
          {!saved.history.items.length ? (
            <p>
              Nenhuma revisão nesta página. Selecione outra competência para
              consultar seu histórico.
            </p>
          ) : (
            <Table aria-label={`Histórico de metas de ${saved.month}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Revisão / data</TableHead>
                  <TableHead>Metas registradas</TableHead>
                  <TableHead>Autor / motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saved.history.items.map((r) => (
                  <TableRow key={r.version}>
                    <TableCell>
                      v{r.version}
                      <p>{dateText(r.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      {metrics.map((key) => (
                        <p key={key}>
                          {labels[key]}:{" "}
                          {valueText(key, r.values[key], "Não definida")}
                        </p>
                      ))}
                    </TableCell>
                    <TableCell>
                      <p>{r.actorName}</p>
                      <p className="whitespace-pre-wrap break-words">
                        {r.reason}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <nav
            aria-label="Paginação do histórico"
            className="flex flex-wrap gap-3"
          >
            {saved.history.page > 1 && (
              <Link
                href={`/rentabilidade/metas?month=${saved.month}&page=${saved.history.page - 1}`}
              >
                Revisões mais recentes
              </Link>
            )}
            <span>Página {saved.history.page}</span>
            {saved.history.page * 20 < saved.history.total && (
              <Link
                href={`/rentabilidade/metas?month=${saved.month}&page=${saved.history.page + 1}`}
              >
                Revisões anteriores
              </Link>
            )}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}
