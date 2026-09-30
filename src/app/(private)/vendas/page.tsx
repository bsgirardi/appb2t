import { requireActor } from "@/server/auth/guards";
import { listSales, saleFilterSchema } from "@/server/sales";
import { commerceOptions } from "@/server/commerce/options";
import { SalePanel } from "@/components/commerce/sale-panel";
export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => v !== ""),
  );
  const parsed = saleFilterSchema.safeParse(raw),
    filters = parsed.success ? parsed.data : saleFilterSchema.parse({});
  const [initial, options] = await Promise.all([
    listSales(actor, filters),
    commerceOptions(actor),
  ]);
  return <SalePanel initial={initial} filters={filters} {...options} />;
}
