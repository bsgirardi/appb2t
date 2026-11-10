"use client";
import { useEffect, useState } from "react";
import type {
  GAReport,
  GoogleReports,
  SourceResult,
} from "@/domain/marketing/reports";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Notice } from "@/components/ui/field";
type Reply =
  | { status: "connected"; reports: GoogleReports }
  | { status: "disconnected" | "not_configured" };
const format = (value: string | number | undefined) =>
  value === undefined
    ? "Sem dados"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
        Number(value),
      );
function currentRows(report: GAReport) {
  return (report.rows ?? []).filter(
    (r) => !r.dimensionValues?.some((d) => d.value === "date_range_1"),
  );
}
function Breakdown({
  report,
  title,
  metric,
}: {
  report: GAReport;
  title: string;
  metric: string;
}) {
  const rows = currentRows(report);
  return (
    <section className="min-w-0">
      <h3>{title}</h3>
      {rows.length ? (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={title}
          tabIndex={0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{title}</TableHead>
                <TableHead>{metric}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="break-all">
                    {row.dimensionValues?.[0]?.value ?? "Não informado"}
                  </TableCell>
                  <TableCell>{format(row.metricValues?.[0]?.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p>Sem dados retornados para este período.</p>
      )}
    </section>
  );
}
function SourceMessage<T>({ source }: { source: SourceResult<T> }) {
  return source.status !== "ready" ? (
    <Notice kind="info">{source.message}</Notice>
  ) : null;
}
export function GoogleAnalyticsPanel({
  configured,
  initialResult,
  settingsVersion,
}: {
  configured: boolean;
  initialResult?: string;
  settingsVersion: number;
}) {
  const [days, setDays] = useState("28"),
    [refresh, setRefresh] = useState(0),
    [reply, setReply] = useState<Reply>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [connecting, setConnecting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/marketing/google/reports?days=${days}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message ??
              "Não foi possível consultar os relatórios.",
          );
        if (active) setReply(result.data);
      })
      .catch((e) => {
        if (active && e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [days, refresh, settingsVersion]);
  async function connect() {
    setConnecting(true);
    setError("");
    try {
      const response = await fetch("/api/marketing/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Não foi possível iniciar a conexão.",
        );
      window.location.assign(result.data.url);
    } catch (e) {
      setError((e as Error).message);
      setConnecting(false);
    }
  }
  async function disconnect() {
    setConnecting(true);
    setError("");
    try {
      const response = await fetch("/api/marketing/google/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Não foi possível desconectar.");
      setReply({ status: "disconnected" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }
  const reports = reply?.status === "connected" ? reply.reports : undefined;
  const ga = reports?.ga4.status === "ready" ? reports.ga4.data : undefined;
  const search =
    reports?.searchConsole.status === "ready"
      ? reports.searchConsole.data
      : undefined;
  const summary = ga ? currentRows(ga.reports[0])[0] : undefined;
  const previous = ga?.reports[0].rows?.find((r) =>
    r.dimensionValues?.some((d) => d.value === "date_range_1"),
  );
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Conexão e relatórios</CardTitle>
          <CardDescription>
            Acesso somente de leitura ao GA4 e ao Search Console. A conexão vale
            para este administrador neste navegador por até 30 dias; não ativa a
            tag da loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {initialResult === "error" && (
              <Notice>
                A conexão não foi concluída. Verifique a conta escolhida e tente
                novamente.
              </Notice>
            )}
            {initialResult === "connected" && (
              <Notice kind="success">
                Autorização recebida. Os dados dependem do acesso às
                propriedades e da disponibilidade de cada fonte.
              </Notice>
            )}
            <p role="status">
              {loading
                ? "Consultando conexão…"
                : reply?.status === "connected"
                  ? "Conta autorizada para consultar relatórios"
                  : configured
                    ? "Conta Google desconectada"
                    : "Integração ainda não configurada no servidor"}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={!configured || connecting}
                onClick={connect}
              >
                {connecting
                  ? "Aguarde…"
                  : reply?.status === "connected"
                    ? "Reconectar ou trocar conta Google"
                    : "Conectar conta Google"}
              </Button>
              {reply?.status === "connected" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={connecting}
                  onClick={disconnect}
                >
                  Desconectar neste navegador
                </Button>
              )}
            </div>
            <p>
              O Google solicitará permissão para ler Analytics e Search Console.
              Use uma conta com acesso às propriedades informadas. Para revogar
              o acesso no Google, gerencie as permissões na sua conta Google.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="analytics-period">Período</Label>
                <NativeSelect
                  id="analytics-period"
                  value={days}
                  onChange={(e) => {
                    setLoading(true);
                    setReply(undefined);
                    setError("");
                    setDays(e.target.value);
                  }}
                >
                  <option value="7">Últimos 7 dias completos</option>
                  <option value="28">Últimos 28 dias completos</option>
                  <option value="90">Últimos 90 dias completos</option>
                </NativeSelect>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setReply(undefined);
                  setError("");
                  setRefresh((v) => v + 1);
                }}
              >
                Atualizar relatórios
              </Button>
            </div>
            <p>
              Comparação: período anterior com a mesma duração. Cache de até 5
              minutos. A latência, os filtros e os limites de cada API podem
              produzir diferenças em relação a outras telas do Google.
            </p>
            {error && <Notice>{error}</Notice>}
            {reports && (
              <p>
                Consulta concluída em{" "}
                {new Date(reports.updatedAt).toLocaleString("pt-BR")}. Os dados
                podem ter sido consultados nos últimos 5 minutos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {reports && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics 4</CardTitle>
              <CardDescription>
                Fonte: Google Analytics Data API. Usuários ativos, sessões e
                visualizações têm significados diferentes; não são somados entre
                páginas, origens ou dispositivos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <SourceMessage source={reports.ga4} />
                {ga && (
                  <>
                    <p>
                      Propriedade: {ga.propertyId}. Fuso:{" "}
                      {ga.reports[0].metadata?.timeZone ??
                        "não informado pela API"}
                      . Últimos {days} dias completos neste fuso, até ontem;
                      comparação com os {days} dias anteriores. Sem filtros de
                      audiência; páginas, origens e dispositivos mostram até 20
                      linhas por relatório.
                    </p>
                    {ga.reports.some(
                      (r) =>
                        r.metadata?.subjectToThresholding ||
                        r.metadata?.dataLossFromOtherRow,
                    ) && (
                      <Notice kind="info">
                        O Google informou limites de privacidade ou agrupamento
                        neste relatório. Os resultados podem ser parciais.
                      </Notice>
                    )}
                    <div
                      className="overflow-x-auto"
                      role="region"
                      aria-label="Resumo GA4"
                      tabIndex={0}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Indicador</TableHead>
                            <TableHead>Período atual</TableHead>
                            <TableHead>Período anterior</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            "Usuários ativos",
                            "Sessões",
                            "Visualizações de página",
                          ].map((name, i) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell>
                                {format(summary?.metricValues?.[i]?.value)}
                              </TableCell>
                              <TableCell>
                                {format(previous?.metricValues?.[i]?.value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Breakdown
                      report={ga.reports[1]}
                      title="Páginas"
                      metric="Visualizações"
                    />
                    <Breakdown
                      report={ga.reports[2]}
                      title="Origens / mídias"
                      metric="Sessões"
                    />
                    <Breakdown
                      report={ga.reports[3]}
                      title="Dispositivos"
                      metric="Sessões"
                    />
                    <Breakdown
                      report={ga.reports[4]}
                      title="Ações registradas"
                      metric="Eventos"
                    />
                    <p>
                      contact_click = clique de contato; catalog_open = acesso
                      pelo botão do catálogo; generate_lead = solicitação
                      enviada; purchase = compra confirmada. Cliques não são
                      leads ou compras. A coleta desta versão envia somente
                      navegação e cliques; conversões só aparecerão se uma
                      integração autoritativa as registrar na propriedade.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>
                Fonte: Search Console API. Resultados orgânicos da pesquisa web,
                separados da audiência do GA4.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <SourceMessage source={reports.searchConsole} />
                {search && (
                  <>
                    <p className="break-all">
                      Propriedade: {search.site}. Fuso: America/Los_Angeles.
                      Dados finais, pesquisa web, sem filtro adicional. Atual:{" "}
                      {reports.period.startDate} a {reports.period.endDate};
                      anterior: {reports.period.previousStart} a{" "}
                      {reports.period.previousEnd}.
                    </p>
                    <div
                      className="overflow-x-auto"
                      role="region"
                      aria-label="Resumo Search Console"
                      tabIndex={0}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Indicador</TableHead>
                            <TableHead>Período atual</TableHead>
                            <TableHead>Período anterior</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(
                            [
                              ["Cliques", "clicks"],
                              ["Impressões", "impressions"],
                              ["CTR (%)", "ctr"],
                              ["Posição média", "position"],
                            ] as const
                          ).map(([label, key]) => (
                            <TableRow key={key}>
                              <TableCell>{label}</TableCell>
                              {[search.current, search.previous].map(
                                (period, i) => (
                                  <TableCell key={i}>
                                    {period.rows?.[0]
                                      ? format(
                                          period.rows[0][key] *
                                            (key === "ctr" ? 100 : 1),
                                        )
                                      : "Sem dados"}
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p>
                      Dias recentes podem ainda não ter dados finais. Ausência
                      de linhas significa dados não retornados, e não zero
                      visitas.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
