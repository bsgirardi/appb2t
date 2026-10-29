import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando pontos de venda"
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
