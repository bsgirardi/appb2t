import { AuthForm } from '@/components/auth-form';
export default function Account(){return <><div className="page-heading"><div className="eyebrow">SEU ACESSO</div><h1>Minha conta</h1><p>Atualize sua senha de acesso ao workspace.</p></div><section className="card account-card"><h2>Alterar senha</h2><AuthForm mode="password"/></section></>;}
