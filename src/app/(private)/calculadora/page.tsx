import { requireActor } from "@/server/auth/guards";
import { getCalculatorData } from "@/server/catalog-inputs";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
export default async function CalculatorPage() {
  const actor = await requireActor().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    throw e;
  });
  return (
    <CalculatorForm data={await getCalculatorData(actor)} role={actor.role} />
  );
}
