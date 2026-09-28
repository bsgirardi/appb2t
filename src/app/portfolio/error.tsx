"use client";
export default function PortfolioError({ reset }: { reset: () => void }) {
  return (
    <main className="portfolio-main">
      <div className="card catalog-empty" role="alert">
        <h1>Não foi possível carregar o catálogo.</h1>
        <p>Tente novamente em alguns instantes.</p>
        <button className="button primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
