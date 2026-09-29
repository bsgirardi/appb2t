import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { AppError } from "@/lib/errors";
export default async function AppearancePage() {
  const actor = await requireAdmin().catch((e) => {
    if (e instanceof AppError && e.code === "FORBIDDEN")
      redirect("/calculadora");
    throw e;
  });
  return <AppearancePanel initial={await getAppearance(actor)} />;
}
