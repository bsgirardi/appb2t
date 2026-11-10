import { notFound, permanentRedirect } from "next/navigation";
import { getPublicAppearance } from "@/server/appearance";
import { redirectDestination } from "@/domain/marketing/seo";
import type { CatalogQuery } from "@/domain/products/catalog-navigation";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function LegacyPage({
  params,
  searchParams,
}: {
  params: Promise<{ legacy: string[] }>;
  searchParams: Promise<CatalogQuery>;
}) {
  const { legacy } = await params;
  const identity = await getPublicAppearance();
  const destination = redirectDestination(
    identity.storefront?.seo,
    "/" + legacy.join("/"),
    await searchParams,
  );
  if (destination) permanentRedirect(destination);
  notFound();
}
