import { requireActor } from "@/server/auth/guards";
import { getCalculatorData } from "@/server/catalog-inputs";
import { CalculatorWorkspace } from "@/components/pricing/calculator-workspace";
import { getPricingCatalog } from "@/server/pricing/catalog";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
export default async function CalculatorPage() {
  const actor = await requireActor().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    throw e;
  });
  return (
    <CalculatorWorkspace
      data={await getCalculatorData(actor)}
      catalog={await getPricingCatalog(actor)}
      role={actor.role}
    />
  );
}
