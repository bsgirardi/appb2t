import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireActor } from "@/server/auth/guards";
import { getPartner, consignmentOptions } from "@/server/consignment/queries";
import { PartnerDetail } from "@/components/consignment/partner-detail";
export default async function PartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor(),
    { id } = await params;
  const [data, options] = await Promise.all([
    getPartner(actor, id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
      throw e;
    }),
    consignmentOptions(actor),
  ]);
  return (
    <PartnerDetail
      data={data}
      options={options}
      actorId={actor.id}
      admin={actor.role === "ADMIN"}
    />
  );
}
