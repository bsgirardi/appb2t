import { db } from "@/lib/db";
import { CheckoutTeamPanel } from "@/components/checkout/checkout-team-panel";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/server/auth/guards";
import { getSale } from "@/server/sales";
import { commerceOptions } from "@/server/commerce/options";
import { SaleDetail } from "@/components/commerce/sale-detail";
import Link from "next/link";
export default async function SalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const [initial, options] = await Promise.all([
    getSale(actor, id),
    commerceOptions(actor),
  ]);
  const checkout = await db.checkout.findUnique({
    where: { saleId: id },
    select: { id: true },
  });
  return (
    <>
      {actor.role === "ADMIN" && (
        <Button asChild variant="outline">
          <Link href={`/financeiro/lancamentos?saleId=${initial.id}`}>
            Ver parcelas no financeiro
          </Link>
        </Button>
      )}
      <SaleDetail
        key={`${initial.id}:${initial.version}`}
        initial={initial}
        {...options}
      />
      {checkout && <CheckoutTeamPanel checkoutId={checkout.id} />}
    </>
  );
}
