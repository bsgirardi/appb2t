import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { AppError } from "@/lib/errors";
import { listCollections } from "@/server/collections";
export default async function AppearancePage() {
  const actor = await requireAdmin().catch((e) => {
    if (e instanceof AppError && e.code === "FORBIDDEN")
      redirect("/calculadora");
    throw e;
  });
  const [initial, collections] = await Promise.all([
    getAppearance(actor),
    listCollections(actor),
  ]);
  return <AppearancePanel initial={initial} collections={collections} />;
}
