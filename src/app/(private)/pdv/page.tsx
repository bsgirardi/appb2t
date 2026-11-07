import { requireActor } from "@/server/auth/guards";
import { getPosOrder } from "@/server/pos/orders";
import { posCatalog } from "@/server/pos/catalog";
import { PosPanel } from "@/components/pos/pos-panel";
export default async function PosPage() {
  const actor = await requireActor();
  const [order, products] = await Promise.all([
    getPosOrder(actor),
    posCatalog(actor),
  ]);
  return <PosPanel initialOrder={order} initialProducts={products} />;
}
