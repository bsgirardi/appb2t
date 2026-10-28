import { requireActor } from "@/server/auth/guards";
import {
  listPartners,
  consignmentOptions,
  consignmentFilterSchema,
} from "@/server/consignment/queries";
import { PartnerPanel } from "@/components/consignment/partner-panel";
import { Notice } from "@/components/ui/field";
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor(),
    raw = Object.fromEntries(
      Object.entries(await searchParams).filter(
        ([, v]) => v !== "" && v !== undefined,
      ),
    ),
    parsed = consignmentFilterSchema.safeParse(raw),
    f = parsed.success ? parsed.data : consignmentFilterSchema.parse({});
  const [initial, options] = await Promise.all([
    listPartners(actor, f),
    consignmentOptions(actor),
  ]);
  return (
    <>
      {!parsed.success && (
        <Notice>Filtros inválidos; exibindo todos os parceiros.</Notice>
      )}
      <PartnerPanel
        initial={initial}
        options={options}
        actorId={actor.id}
        admin={actor.role === "ADMIN"}
        query={f.query}
        pending={f.pending}
        productId={f.productId}
      />
    </>
  );
}
