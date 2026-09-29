import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/shell/brand";
import { getPublicAppearance } from "@/server/appearance";
import { Layers3, Check } from "lucide-react";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const { changed } = await searchParams;
  const identity = await getPublicAppearance();
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand identity={identity} />
        <div className="story-main">
          <div className="eyebrow">DA IDEIA AO PREÇO CERTO</div>
          <h1>
            Precisão em
            <br />
            cada camada.
            <br />
            <span>Lucro em cada peça.</span>
          </h1>
          <p>
            Uma visão completa dos seus custos de impressão 3D, em um só lugar.
          </p>
          <div className="layer-art" aria-hidden="true">
            <Layers3 size={170} strokeWidth={0.75} />
          </div>
          <div className="story-features">
            <span>
              <Check size={16} />
              Custos detalhados
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
          <span className="tag">WORKSPACE INTERNO</span>
          <h2>Bom ter você por aqui.</h2>
          <p>Entre para continuar suas simulações.</p>
          {changed && (
            <div className="notice success">
              Senha atualizada. Entre novamente.
            </div>
          )}
          <AuthForm />
          <div className="login-help">
            Precisa de acesso? Fale com o administrador da sua equipe.
          </div>
        </div>
      </section>
    </div>
  );
}
