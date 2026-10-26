import { Skeleton } from "@/components/ui/skeleton";
export default function DashboardLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Carregando indicadores"
    >
      <span className="sr-only">Carregando indicadores…</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
