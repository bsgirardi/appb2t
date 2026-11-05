import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function activeCommerceFilters(filters: Record<string, unknown>) {
  return Object.entries(filters).filter(
    ([key, value]) =>
      !["page", "pageSize"].includes(key) && value && value !== "all",
  ).length;
}

const labels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  EXPIRADO: "Expirado",
  CONVERTIDO: "Convertido",
  CONFIRMADA: "Confirmada",
  EM_PRODUCAO: "Em produção",
  PRONTA: "Pronta",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
  realizadas: "Realizadas",
};
export function commerceStatusLabel(status: string) {
  return labels[status] ?? status;
}
export function CommerceStatus({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "CANCELADA" || status === "REJEITADO"
          ? "destructive"
          : status === "RASCUNHO"
            ? "outline"
            : "secondary"
      }
    >
      {commerceStatusLabel(status)}
    </Badge>
  );
}
export function ListFeedback({
  total,
  filtered,
  noun,
  onFirst,
  onClear,
}: {
  total: number;
  filtered: boolean;
  noun: string;
  onFirst: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status">
      <p>
        {total > 0
          ? "Esta página está fora dos resultados."
          : filtered
            ? "Nenhum resultado para os filtros aplicados."
            : `Ainda não há ${noun}. Use a ação no início da página para criar.`}
      </p>
      {total > 0 ? (
        <Button type="button" variant="outline" onClick={onFirst}>
          Voltar à primeira página
        </Button>
      ) : (
        filtered && (
          <Button type="button" variant="outline" onClick={onClear}>
            Limpar filtros
          </Button>
        )
      )}
    </div>
  );
}
