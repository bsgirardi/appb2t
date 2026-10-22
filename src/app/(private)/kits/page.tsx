import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { AppError } from "@/lib/errors";
import { listKits } from "@/server/kits/service";
import { listProducts } from "@/server/products";
import { KitPanel } from "@/components/kits/kit-panel";
export default async function KitsPage() {
  const actor = await requireActor().catch((error) => {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED")
      redirect("/login");
    throw error;
  });
  const [kits, products] = await Promise.all([
    listKits(actor),
    listProducts(actor),
  ]);
  return (
    <KitPanel
      initialKits={kits}
      products={products.map(({ id, name, active, availability }) => ({
        id,
        name,
        active,
        availability,
      }))}
    />
  );
}
