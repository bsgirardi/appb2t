import { requireActor } from "@/server/auth/guards";
import { listCollections } from "@/server/collections";
import { listProducts } from "@/server/products";
import { CollectionPanel } from "@/components/collections/collection-panel";
export default async function CollectionsPage() {
  const actor = await requireActor();
  const [collections, products] = await Promise.all([
    listCollections(actor),
    listProducts(actor),
  ]);
  return <CollectionPanel collections={collections} products={products} />;
}
