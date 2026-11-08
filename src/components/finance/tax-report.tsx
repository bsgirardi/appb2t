"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import type { TaxReport } from "@/server/tax/reports";
import { formatBRL } from "@/domain/calculation/calculate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { dateLabel } from "./shared";
export type TaxMemorySummary = {
  id: string;
  actorName: string;
  createdAt: string;
  result: TaxReport;
};
export function TaxReportPanel({
  report,
  memories,
  memory,
}: {
  report: TaxReport;
  memories: TaxMemorySummary[];
  memory?: TaxMemorySummary;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const operation = useRef<string | null>(null),
    lock = useRef(false);
  const incomplete =
    report.partialSales > 0 ||
    report.unassignedSales > 0 ||
    !report.monthlyProfile;
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    operation.current ??= crypto.randomUUID();
    try {
      const saved = await api<{ id: string }>("/api/tax/reports", {
        competence: report.competence,
        expectedFingerprint: report.fingerprint,
        operationKey: operation.current,
      });
      router.push(
        `/financeiro/tributos?memory=${encodeURIComponent(saved.id)}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="finance-reading flex flex-col gap-6">
      <form
        action="/financeiro/tributos"
        className="flex flex-wrap items-end gap-3"
      >
        <FieldGroup>
          <Field
            label="Competência tributária"
            name="competence"
            type="month"
            defaultValue={report.competence}
            required
          />
        </FieldGroup>
        <Button type="submit" variant="outline">
          Consultar previsão
        </Button>
        {memory && (
          <Button asChild variant="outline">
            <Link
              href={`/financeiro/tributos?competence=${encodeURIComponent(report.competence)}`}
            >
              Consultar visão corrente desta competência
            </Link>
          </Button>
        )}
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Tributos — previsão gerencial</CardTitle>
          <CardDescription>
            {report.competence} ·{" "}
            {memory
              ? `Memória salva por ${memory.actorName}. Não acompanha alterações posteriores.`
              : "Visão corrente de vendas confirmadas, com suas premissas congeladas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Alert role="note">
            <AlertTitle>
              Estimativas separadas de títulos e pagamentos
            </AlertTitle>
            <AlertDescription>
              Este resumo não emite guias, não apura o imposto oficial e não
              altera caixa ou contas a pagar. Registre valores apurados no fluxo
              financeiro existente. Não some previsão e pagamento como duas
              despesas.
            </AlertDescription>
          </Alert>
          {incomplete && (
            <Alert role="note">
              <AlertTitle>Cobertura incompleta nesta consulta</AlertTitle>
              <AlertDescription>
                Há premissas ausentes, vendas parciais ou vendas sem competência
                identificada. Um zero na parcela conhecida não significa isenção
                nem ausência de tributos. Confira a cobertura e as fontes
                abaixo.
              </AlertDescription>
            </Alert>
          )}
          <dl className="finance-summary">
            <div>
              <dt>DAS MEI — custo fixo mensal previsto</dt>
              <dd>
                {report.monthlyDas === null
                  ? report.monthlyProfile
                    ? "Não se aplica ao perfil Simples"
                    : "Perfil mensal indisponível"
                  : formatBRL(report.monthlyDas)}
              </dd>
            </div>
            <div>
              <dt>Parcela conhecida de tributos sobre vendas</dt>
              <dd>
                {formatBRL(report.knownSalesTax)}{" "}
                <Badge variant="outline">
                  Estimativa{" "}
                  {report.partialSales || report.unassignedSales
                    ? "parcial"
                    : "das vendas cobertas"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Vendas com premissa coberta / parcial</dt>
              <dd>
                {report.completeSales} / {report.partialSales}
              </dd>
            </div>
            <div>
              <dt>Base do mês sem cobertura, incluindo frete</dt>
              <dd>{formatBRL(report.uncoveredBase)}</dd>
            </div>
          </dl>
          {report.monthlyProfile && (
            <section
              aria-label="Fonte do perfil mensal"
              className="finance-source"
            >
              <h3>Perfil mensal da competência</h3>
              <p>
                {report.monthlyProfile.regime === "MEI"
                  ? "MEI (SIMEI) — DAS mensal separado das vendas"
                  : `Simples — alíquota informada de ${report.monthlyProfile.percent}%`}{" "}
                · revisão {report.monthlyProfile.revision} · vigência{" "}
                {report.monthlyProfile.startsAt} a{" "}
                {report.monthlyProfile.endsAt}.
              </p>
              <p>
                Origem: {report.monthlyProfile.source}. Data da conferência:{" "}
                {dateLabel(report.monthlyProfile.checkedOn)}.{" "}
                {report.monthlyProfile.verification === "CHECKED"
                  ? "Conferência declarada no cadastro."
                  : "Informado, sem conferência declarada."}
              </p>
              <p>
                Este perfil mensal não substitui as premissas congeladas de cada
                venda. As referências por venda aparecem nas fontes abaixo.
              </p>
            </section>
          )}
          <p className="text-sm text-muted-foreground">
            {report.unassignedSales} vendas sem data de confirmação fiscal
            identificada não foram atribuídas a esta competência. Os registros
            B2T não representam necessariamente toda a receita fiscal da
            empresa. O mês é o da confirmação comercial; não é opção de apuração
            fiscal por caixa ou competência.
          </p>
          {report.monthlyDas !== null && (
            <p>
              O DAS não é proporcionalizado por dias e não foi rateado nas
              peças. Se o perfil mudou de MEI para outro regime no período,
              confira as premissas das vendas: não combine regimes divergentes
              como se fosse cobertura completa.
            </p>
          )}
          <details>
            <summary>Fontes por venda ({report.rows.length})</summary>
            {!report.rows.length && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nenhuma venda atribuída à competência</EmptyTitle>
                  <EmptyDescription>
                    Não há fontes por venda neste mês. Isso não comprova
                    ausência de receita fiscal ou de tributos da empresa.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            <ul className="flex flex-col gap-3">
              {report.rows.map((r) => (
                <li key={r.saleId}>
                  <Link href={`/vendas/${r.saleId}`} className="underline">
                    {r.number}
                  </Link>{" "}
                  · parcela conhecida {formatBRL(r.knownAmount)} ·{" "}
                  {r.complete
                    ? "Premissas cobertas (estimativa)"
                    : "Cobertura parcial"}
                  <p>{r.reasons.join(" ")}</p>
                  <ul>
                    {r.lines.map((l) => (
                      <li key={l.key}>
                        Base {formatBRL(l.base)} ·{" "}
                        {l.amount === null
                          ? "Tributo indisponível"
                          : formatBRL(l.amount)}{" "}
                        ·{" "}
                        {l.premise?.profile
                          ? `Revisão ${l.premise.profile.revision} / ${l.premise.competence}`
                          : "Sem memória fiscal"}
                        {l.premise?.profile && (
                          <p>
                            {l.premise.profile.regime === "MEI"
                              ? "MEI: DAS mensal separado"
                              : `Simples: ${l.premise.profile.percent}% informado`}{" "}
                            · vigência {l.premise.profile.startsAt} a{" "}
                            {l.premise.profile.endsAt} ·{" "}
                            {l.premise.profile.scope}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
          {busy && (
            <p role="status">Salvando memória… Aguarde a confirmação.</p>
          )}
          {error && (
            <Notice>
              {error} A memória não foi confirmada nesta tela. Ao tentar
              novamente, a mesma operação será recuperada; se as fontes mudaram,
              consulte a previsão novamente.
            </Notice>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          {!memory && (
            <Button type="button" disabled={busy} onClick={save}>
              {busy ? "Salvando…" : "Salvar memória do resumo"}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/financeiro/lancamentos">
              Consultar títulos e pagamentos
            </Link>
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Memórias da competência</CardTitle>
          <CardDescription>
            Consultas preservadas; uma nova consulta não reescreve as
            anteriores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memories.length ? (
            <ul className="flex flex-col gap-2">
              {memories.map((m) => (
                <li key={m.id}>
                  <Link
                    className="underline"
                    href={`/financeiro/tributos?memory=${encodeURIComponent(m.id)}`}
                  >
                    {new Date(m.createdAt).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}{" "}
                    · {m.actorName}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhuma memória salva nesta competência</EmptyTitle>
                <EmptyDescription>
                  A consulta corrente não é uma memória preservada. Use “Salvar
                  memória do resumo” para guardar as fontes e o resultado desta
                  consulta.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
