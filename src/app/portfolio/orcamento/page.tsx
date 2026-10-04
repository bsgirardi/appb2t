import type { Metadata } from "next";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { InquiryPanel } from "@/components/products/inquiry-panel";
import { getPublicAppearance } from "@/server/appearance";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Minha lista de orçamento",
  robots: { index: false, follow: true },
};
export default async function InquiryPage() {
  return (
    <StorefrontShell identity={await getPublicAppearance()}>
      <InquiryPanel />
    </StorefrontShell>
  );
}
