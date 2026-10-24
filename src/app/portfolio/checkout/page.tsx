import type { Metadata } from "next";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getPublicAppearance } from "@/server/appearance";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Concluir pedido | B2T",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function CheckoutPage() {
  return (
    <StorefrontShell identity={await getPublicAppearance()}>
      <CheckoutForm />
    </StorefrontShell>
  );
}
