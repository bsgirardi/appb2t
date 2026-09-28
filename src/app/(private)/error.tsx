"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card">
      <h1>Não foi possível carregar os dados.</h1>
      <p>Verifique sua conexão e tente novamente.</p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
