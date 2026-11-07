import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { AppError } from "@/lib/errors";
export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    if (e instanceof AppError && e.code === "FORBIDDEN") redirect("/vendas");
    throw e;
  });
  return (
    <div className="finance-workspace">
      <nav className="finance-nav" aria-label="Navegação financeira">
        <Link href="/financeiro">Visão geral</Link>
        <Link href="/financeiro/lancamentos">A pagar e receber</Link>
        <Link href="/financeiro/contas">Contas e categorias</Link>
        <Link href="/financeiro/movimentos">Movimentos e exportação</Link>
        <Link href="/financeiro/tributos">Previsão tributária</Link>
      </nav>
      {children}
    </div>
  );
}
