import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getCommercialSettings } from "@/server/commercial-settings";
import { getTaxProfiles } from "@/server/tax/profiles";
import { requireActor } from "@/server/auth/guards";
import { db } from "@/lib/db";
import { printerDTO } from "@/server/catalog-inputs";
import { settingsDTO } from "@/server/settings";
import { userSelect } from "@/server/users";
import { getPricingCatalog } from "@/server/pricing/catalog";
import { AppError } from "@/lib/errors";
import { redirect } from "next/navigation";
export default async function SettingsPage() {
  const actor = await requireActor().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    throw e;
  });
  if (actor.role !== "ADMIN") return null;
  const [
    materials,
    printers,
    settings,
    users,
    commercialSettings,
    catalog,
    tax,
  ] = await Promise.all([
    db.material.findMany({ orderBy: { name: "asc" } }),
    db.printer.findMany({ orderBy: { name: "asc" } }),
    db.calculationSettings.findUnique({ where: { id: 1 } }),
    db.user.findMany({ select: userSelect, orderBy: { name: "asc" } }),
    getCommercialSettings(),
    getPricingCatalog(actor, true),
    getTaxProfiles(actor),
  ]);
  return (
    <SettingsWorkspace
      catalog={catalog}
      commercial={commercialSettings}
      tax={tax}
      initialData={{
        materials: materials.map((m) => ({
          ...m,
          price: m.price.toString(),
        })),
        printers: printers.map(printerDTO),
        settings: settings ? settingsDTO(settings) : null,
        users,
      }}
    />
  );
}
