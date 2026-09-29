import { requireActor } from "@/server/auth/guards";
import { listCustomers } from "@/server/customers";
import { CustomerPanel } from "@/components/customers/customer-panel";
import { customerFilterSchema } from "@/domain/customers/validation";
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const raw = await searchParams;
  const parsed = customerFilterSchema.safeParse(raw);
  const filter = parsed.success ? parsed.data : customerFilterSchema.parse({});
  return (
    <CustomerPanel
      initial={await listCustomers(actor, filter)}
      search={filter.search}
      active={filter.active}
    />
  );
}
