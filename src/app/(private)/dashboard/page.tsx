import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireActor } from "@/server/auth/guards";
import { getDashboard } from "@/server/dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL as money } from "@/domain/calculation/calculate";

export default async function DashboardPage() {
  const data = await getDashboard(await requireActor());
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${data.month}-15T12:00:00-03:00`));
  const metrics = [
    {
      title: "Vendas do mês",
      value: money(data.salesValue),
      description: `${data.salesCount} vendas criadas em ${month}, exceto rascunhos e canceladas.`,
      href: `/vendas?status=realizadas&from=${data.month}-01&to=${data.today}`,
    },
    {
      title: "Orçamentos em aberto",
      value: String(data.quotes),
      description:
        "Rascunhos e propostas enviadas ou aprovadas dentro da validade.",
      href: "/orcamentos",
    },
    {
      title: "Ordens em produção",
      value: String(data.production),
      description: "Ordens liberadas ou em execução neste momento.",
      href: "/producao",
    },
    ...(data.finance
      ? [
          {
            title: "Saldo atual",
            value:
              data.finance.balance === null
                ? "Não informado"
                : money(data.finance.balance),
            description: "Posição das contas financeiras até hoje.",
            href: "/financeiro",
          },
          {
            title: "A receber",
            value: money(data.finance.receivablePending),
            description: "Saldo previsto em recebíveis ainda pendentes.",
            href: "/financeiro/lancamentos?kind=RECEIVABLE",
          },
          {
            title: "A pagar",
            value: money(data.finance.payablePending),
            description: "Saldo previsto em pagamentos ainda pendentes.",
            href: "/financeiro/lancamentos?kind=PAYABLE",
          },
        ]
      : []),
  ];
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="page-heading mb-0">
        <div>
          <div className="eyebrow">VISÃO GERAL</div>
          <h1>Dashboard B2T</h1>
          <p>Acompanhe vendas, produção e os próximos passos da equipe.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/vendas">
            Ver vendas
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">
        Atualizado em {data.today.split("-").reverse().join("/")} · Vendas de{" "}
        {month}
      </p>
      <div className="dashboard-metrics">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <CardTitle>{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="dashboard-value">{metric.value}</p>
            </CardContent>
            <CardFooter className="flex-col items-stretch justify-between gap-3">
              <CardDescription>{metric.description}</CardDescription>
              <Button
                asChild
                variant="link"
                size="sm"
                className="justify-start px-0"
              >
                <Link href={metric.href}>
                  Ver detalhes
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>O que precisa de atenção</CardTitle>
          <CardDescription>
            Prioridades atuais para dar continuidade aos pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="dashboard-priorities">
            <Link href="/producao">
              <strong>{data.overdueProduction}</strong>
              <span>Ordens ativas com prazo vencido</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link href="/vendas?status=PRONTA">
              <strong>{data.readySales}</strong>
              <span>Vendas prontas para entrega</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
            {data.finance && (
              <Link href="/financeiro/lancamentos?kind=RECEIVABLE&overdue=true">
                <strong>{money(data.finance.receivableOverdue)}</strong>
                <span>Recebíveis vencidos</span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
