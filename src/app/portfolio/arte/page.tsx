import type { Metadata } from "next";
import { PublicArtReview } from "@/components/art/public-review";
import { getPublicAppearance } from "@/server/appearance";
import { siteThemeVariables } from "@/domain/appearance/theme";
import type { CSSProperties } from "react";
import "./style.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Revisão privada de arte | B2T",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function ArtReviewPage() {
  return (
    <div
      className="storefront"
      style={siteThemeVariables(await getPublicAppearance()) as CSSProperties}
    >
      <PublicArtReview />
    </div>
  );
}
