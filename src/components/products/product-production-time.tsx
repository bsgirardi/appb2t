export function ProductProductionTime({ days }: { days?: number | null }) {
  if (!days) return null;
  return (
    <p>
      Produção em até {days} {days === 1 ? "dia útil" : "dias úteis"}. Prazo de
      transporte à parte.
    </p>
  );
}
