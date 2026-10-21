import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KitBuilder } from "@/components/kits/kit-builder";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { getPublicKit, getPublicKitProducts } from "@/server/kits/queries";
import { getPublicAppearance } from "@/server/appearance";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Monte seu conjunto",
  robots: { index: false, follow: true },
};
export default async function KitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ montagem?: string }>;
}) {
  const { id } = await params,
    { montagem } = await searchParams;
  const [kit, products, identity] = await Promise.all([
    getPublicKit(id),
    getPublicKitProducts(id),
    getPublicAppearance(),
  ]);
  if (!kit) notFound();
  return (
    <StorefrontShell identity={identity}>
      <KitBuilder
        kit={kit}
        products={products}
        initialInstanceId={
          montagem && montagem.length <= 100 ? montagem : undefined
        }
      />
    </StorefrontShell>
  );
}
