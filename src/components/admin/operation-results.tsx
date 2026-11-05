import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";

export function OperationResults({
  total,
  page,
  pageSize,
  filtered,
  href,
  clearHref,
}: {
  total: number;
  page: number;
  pageSize: number;
  filtered: boolean;
  href: (page: number) => string;
  clearHref: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
      {(total === 0 || page > pages) && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {page > pages
                ? "Esta página não tem registros"
                : filtered
                  ? "Nenhum resultado para estes filtros"
                  : "Nenhum registro nesta visão"}
            </EmptyTitle>
            <EmptyDescription>
              {page > pages
                ? "Os resultados podem ter mudado. Volte à primeira página mantendo os filtros."
                : filtered
                  ? "Revise a busca ou limpe os filtros para consultar os demais registros."
                  : "Os registros aparecerão aqui quando houver atividade nesta visão."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={href(1)}>Primeira página</Link>
              </Button>
            ) : (
              filtered && (
                <Button asChild variant="outline">
                  <Link href={clearHref}>Limpar filtros</Link>
                </Button>
              )
            )}
          </EmptyContent>
        </Empty>
      )}
      <Pagination aria-label="Paginação dos resultados">
        <p role="status">
          {total} registros · página {page} de {pages}
        </p>
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={href(page - 1)}>Anterior</Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild variant="outline">
            <Link href={href(page + 1)}>Próxima</Link>
          </Button>
        )}
      </Pagination>
    </>
  );
}
