"use client";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function DashboardError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive" role="alert">
        Não foi possível carregar os indicadores. Tente novamente; se o problema
        continuar, confira a conexão e os registros da operação.
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => retry()}>Tentar novamente</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Abrir visão geral</Link>
        </Button>
      </div>
    </div>
  );
}
