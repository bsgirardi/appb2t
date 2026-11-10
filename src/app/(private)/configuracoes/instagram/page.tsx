import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { instagramConnection } from "@/server/instagram";
import { instagramSettingsSchema } from "@/domain/marketing/instagram";
import { InstagramPanel } from "@/components/settings/instagram-panel";
import { AppError } from "@/lib/errors";
export default async function InstagramPage() {
  const actor = await requireAdmin().catch((e) => {
    if (e instanceof AppError && e.code === "FORBIDDEN")
      redirect("/calculadora");
    throw e;
  });
  const initial = await getAppearance(actor);
  return (
    <InstagramPanel
      initial={instagramSettingsSchema.parse(
        initial.storefront?.instagram ?? {},
      )}
      initialVersion={initial.version}
      {...instagramConnection()}
    />
  );
}
