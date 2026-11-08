import Link from "next/link";
import type { CSSProperties } from "react";
import { themeVariables } from "@/domain/appearance/theme";
import { AuthForm } from "@/components/auth-form";
import { Notice } from "@/components/ui/field";
import { Brand } from "@/components/shell/brand";
import { getPublicAppearance } from "@/server/appearance";
import { Layers3, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_VERSION } from "@/lib/version";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const { changed } = await searchParams;
  const identity = await getPublicAppearance();
  return (
    <div
      className="login-page admin-theme font-admin"
      style={themeVariables(identity) as CSSProperties}
    >
      <section className="login-story">
        <Brand identity={identity} />
        <div className="story-main">
          <div className="eyebrow">Da ideia à entrega</div>
          <h1>
            Sua operação 3D, <br />
            em um só lugar.
          </h1>
          <p>
            Produtos, orçamentos, vendas e produção conectados para acompanhar o
            trabalho da equipe.
          </p>
          <div className="layer-art" aria-hidden="true">
            <Layers3 size={170} strokeWidth={0.75} />
          </div>
          <div className="story-features">
            <span>
              <Check size={16} />
              Do orçamento à produção
            </span>
            <span>
              <Check size={16} />
              Equipe conectada
            </span>
          </div>
        </div>
        <small>{identity.footer}</small>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <ThemeToggle />
          <span className="tag">Área da equipe</span>
          <h2>Bom ter você por aqui.</h2>
          <p>Entre para acompanhar sua operação.</p>
          {changed && (
            <Notice kind="success">Senha atualizada. Entre novamente.</Notice>
          )}
          <AuthForm />
          <div className="login-help">
            <p>Precisa de acesso? Fale com o administrador da sua equipe.</p>
            <Link href="/#all-products">Explorar o catálogo público</Link>
          </div>
          <footer className="mt-4 text-center text-xs text-muted-foreground">
            Versão {APP_VERSION}
          </footer>
        </div>
      </section>
    </div>
  );
}
