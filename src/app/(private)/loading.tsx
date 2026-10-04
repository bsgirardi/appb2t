import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <Card asChild>
      <div className="" role="status">
        Carregando seu workspace…
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    </Card>
  );
}
