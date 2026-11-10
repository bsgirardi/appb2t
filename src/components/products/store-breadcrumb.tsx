import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
export function StoreBreadcrumb({
  href = "/catalogo",
  title,
}: {
  href?: string;
  title: string;
}) {
  return (
    <Breadcrumb className="store-breadcrumb" aria-label="Você está em">
      <BreadcrumbList className="m-0 list-none p-0">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={href}>Catálogo</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="break-words">{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
