import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import {
  getProfitabilityReport,
  listUnassignedLosses,
  defaultPeriod,
} from "@/server/profitability/queries";
import { db } from "@/lib/db";
import { ProfitabilityReport } from "@/components/profitability/report";
import { moneyText } from "@/components/profitability/detail";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin();
  await requireProfitabilityAdmin(actor);
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).filter(
      (e): e is [string, string] => typeof e[1] === "string" && e[1] !== "",
    ),
  );
  const { lossFrom, lossTo, lossPage, ...filter } = params,
    period = defaultPeriod();
  const [result, losses, channels, products] = await Promise.all([
    getProfitabilityReport(actor, filter),
    listUnassignedLosses(actor, {
      from: lossFrom ?? period.from,
      to: lossTo ?? period.to,
      page: lossPage ?? "1",
    }),
    db.pricingChannel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const href = (p: Record<string, string>) =>
    `/rentabilidade?${new URLSearchParams({ ...params, ...p })}`;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h1>Rentabilidade operacional</h1>
      <p>Vendas confirmadas no período — resultado acumulado atualizado</p>
      <form className="flex flex-wrap items-end gap-3">
        <Field
          label="Confirmação de"
          name="from"
          type="date"
          defaultValue={params.from ?? period.from}
        />
        <Field
          label="Confirmação até"
          name="to"
          type="date"
          defaultValue={params.to ?? period.to}
        />
        <Label className="flex items-center gap-2">
          <input
            name="undated"
            type="checkbox"
            value="true"
            defaultChecked={params.undated === "true"}
          />
          Sem data de confirmação
        </Label>
        <Label className="field">
          Situação
          <NativeSelect
            name="situation"
            defaultValue={params.situation ?? "NORMAL"}
          >
            <option value="NORMAL">Vendas normais</option>
            <option value="EXCEPTIONS">Canceladas / pendências</option>
          </NativeSelect>
        </Label>
        <Label className="field">
          Produto
          <NativeSelect name="productId" defaultValue={params.productId ?? ""}>
            <option value="">Todos</option>
            <option value="__none__">Sem produto vinculado</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field">
          Canal
          <NativeSelect name="channelId" defaultValue={params.channelId ?? ""}>
            <option value="">Todos</option>
            <option value="__none__">Não informado</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field">
          Cobertura realizada
          <NativeSelect name="coverage" defaultValue={params.coverage ?? ""}>
            <option value="">Todas</option>
            <option value="UNAVAILABLE">Indisponível</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PROVISIONAL">Provisória</option>
            <option value="COMPLETE">Completa</option>
          </NativeSelect>
        </Label>
        <Button>Atualizar visão</Button>
      </form>
      <Notice kind="info">
        O período seleciona a confirmação das vendas. Custos posteriores entram
        na visão atual. O filtro de produto inclui os pedidos inteiros que
        contêm esse produto. Estes indicadores não representam DRE nem lucro
        líquido.
      </Notice>
      <ProfitabilityReport result={result} />
      <nav aria-label="Paginação de pedidos" className="flex gap-3">
        {result.page > 1 ? (
          <Link href={href({ page: String(result.page - 1) })}>Anterior</Link>
        ) : null}
        <span>Página {result.page}</span>
        {result.page * result.pageSize < result.total ? (
          <Link href={href({ page: String(result.page + 1) })}>Próxima</Link>
        ) : null}
      </nav>
      <Card>
        <CardHeader>
          <CardTitle>Perdas não atribuídas a pedidos</CardTitle>
          <CardDescription>
            Filtro próprio pela data do fato. Valores separados dos resultados
            comerciais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            {Object.entries(filter).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <Field
              label="Perdas de"
              name="lossFrom"
              type="date"
              defaultValue={lossFrom ?? period.from}
            />
            <Field
              label="Perdas até"
              name="lossTo"
              type="date"
              defaultValue={lossTo ?? period.to}
            />
            <Button variant="outline">Filtrar perdas</Button>
          </form>
          {!losses.total ? (
            <p>Nenhuma perda encontrada neste período.</p>
          ) : (
            <ul>
              {losses.items.map((l) => (
                <li key={l.sourceId}>
                  {l.effectiveDate.split("-").reverse().join("/")} · {l.reason}{" "}
                  · {moneyText(l.value)}
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Paginação de perdas" className="flex gap-3">
            {Number(lossPage ?? 1) > 1 ? (
              <Link href={href({ lossPage: String(Number(lossPage) - 1) })}>
                Perdas anteriores
              </Link>
            ) : null}
            {Number(lossPage ?? 1) * 20 < losses.total ? (
              <Link
                href={href({ lossPage: String(Number(lossPage ?? 1) + 1) })}
              >
                Mais perdas
              </Link>
            ) : null}
          </nav>
        </CardContent>
      </Card>
    </section>
  );
}
