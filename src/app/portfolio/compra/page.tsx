import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { CheckoutContinuation } from "@/components/checkout/checkout-continuation";
import { getPublicAppearance } from "@/server/appearance";
import { siteThemeVariables } from "@/domain/appearance/theme";
import { ThemeToggle } from "@/components/theme-toggle";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Seu pedido | B2T",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function CheckoutContinuationPage() {
  return (
    <div
      className="storefront min-h-screen"
      style={siteThemeVariables(await getPublicAppearance()) as CSSProperties}
    >
      <div className="private-theme-control">
        <ThemeToggle />
      </div>
      <CheckoutContinuation />
    </div>
  );
}
