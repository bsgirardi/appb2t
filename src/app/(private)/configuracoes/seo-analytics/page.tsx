import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { googleConfigured } from "@/server/google/connection";
import { appUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { SeoPanel } from "@/components/settings/seo-panel";
import { seoImageOptions } from "@/server/seo-images";
export default async function SeoAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const actor = await requireAdmin().catch((e) => {
    if (e instanceof AppError && e.code === "FORBIDDEN")
      redirect("/calculadora");
    throw e;
  });
  const [initial, images] = await Promise.all([
    getAppearance(actor),
    seoImageOptions(actor),
  ]);
  return (
    <SeoPanel
      initial={initial}
      images={images}
      canonicalOrigin={appUrl().origin}
      googleConfigured={googleConfigured()}
      collectionEnabled={
        process.env.GOOGLE_ANALYTICS_COLLECTION_ENABLED === "true" &&
        process.env.GOOGLE_ANALYTICS_MANUAL_MEASUREMENT_CONFIRMED === "true"
      }
      googleResult={(await searchParams).google}
    />
  );
}
