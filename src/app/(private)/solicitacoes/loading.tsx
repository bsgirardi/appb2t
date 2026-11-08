import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-label="Carregando solicitações"
    >
      <span className="sr-only">Carregando solicitações…</span>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
