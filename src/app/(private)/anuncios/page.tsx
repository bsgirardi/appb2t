import Link from "next/link";
import { requireActor } from "@/server/auth/guards";
import { listAdDrafts, listAdProducts } from "@/server/advertising/queries";
import { adQuerySchema } from "@/domain/advertising/validation";
import { AdLibrary } from "@/components/advertising/ad-library";
import { Notice } from "@/components/ui/field";
export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor(),
    raw = await searchParams;
  const parsed = adQuerySchema.safeParse({
    search: raw.search ?? "",
    page: raw.page ?? 1,
    ...(raw.channel ? { channel: raw.channel } : {}),
    ...(raw.status ? { status: raw.status } : {}),
  });
  if (!parsed.success)
    return (
      <>
        <h1>Anúncios</h1>
        <Notice>Confira os filtros da biblioteca.</Notice>
        <Link href="/anuncios">Voltar à biblioteca</Link>
      </>
    );
  const [initial, initialProducts] = await Promise.all([
    listAdDrafts(actor, parsed.data),
    listAdProducts(actor, { search: "", page: 1 }),
  ]);
  return (
    <AdLibrary
      key={JSON.stringify(parsed.data)}
      initial={initial}
      query={parsed.data}
      initialProducts={initialProducts}
    />
  );
}
