import Link from "next/link";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

/** Presentation only: retain the current selection when recovering an empty page. */
export function FinanceEmpty({
  noun,
  total = 0,
  base,
  query = {},
}: {
  noun: "títulos" | "movimentos";
  total?: number;
  base: string;
  query?: Record<string, string>;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          {total > 0
            ? `Esta página não tem ${noun}`
            : `Nenhum ${noun === "títulos" ? "título encontrado" : "movimento encontrado"}`}
        </EmptyTitle>
        <EmptyDescription>
          {total > 0
            ? `${total} ${noun} correspondem aos critérios. Volte à primeira página para consultá-los.`
            : `Não há ${noun} para os critérios aplicados. Revise o período e os filtros; esta consulta não indica ausência de registros em outros períodos.`}
        </EmptyDescription>
      </EmptyHeader>
      {total > 0 && (
        <EmptyContent>
          <Button asChild variant="outline">
            <Link
              href={`${base}?${new URLSearchParams({ ...query, page: "1" })}`}
            >
              Voltar à primeira página
            </Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
