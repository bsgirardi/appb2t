import { redirect } from "next/navigation";
import { ProductPanel } from "@/components/products/product-panel";
import { requireActor } from "@/server/auth/guards";
import { getCalculatorData } from "@/server/catalog-inputs";
import { listProducts } from "@/server/products";
import { AppError } from "@/lib/errors";
import { listCollections } from "@/server/collections";
export default async function ProductsPage() {
  const actor = await requireActor().catch((error) => {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED")
      redirect("/login");
    throw error;
  });
  const [products, data, collections] = await Promise.all([
    listProducts(actor),
    getCalculatorData(actor),
    listCollections(actor),
  ]);
  return (
    <ProductPanel
      products={products}
      data={data}
      role={actor.role}
      collections={collections}
    />
  );
}
