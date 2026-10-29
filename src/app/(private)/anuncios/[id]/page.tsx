import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireActor } from "@/server/auth/guards";
import { getAdDraft } from "@/server/advertising/queries";
import { AdEditor } from "@/components/advertising/ad-editor";
export default async function AdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const draft = await getAdDraft(actor, (await params).id).catch((error) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return <AdEditor key={draft.id} initial={draft} />;
}
