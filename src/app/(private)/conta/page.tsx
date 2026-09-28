import { AuthForm } from "@/components/auth-form";
import { LogoutButton } from "@/components/logout-button";
export default function Account() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU ACESSO</div>
          <h1>Minha conta</h1>
          <p>Atualize sua senha de acesso ao workspace.</p>
        </div>
        <LogoutButton />
      </div>
      <section className="card account-card">
        <h2>Alterar senha</h2>
        <AuthForm mode="password" />
      </section>
    </>
  );
}
