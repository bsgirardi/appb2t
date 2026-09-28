import Image from "next/image";
import { Box, CreditCard } from "lucide-react";
import { formatBRL } from "@/domain/calculation/calculate";
import type { PublicProductDTO } from "@/domain/products/types";
export function ProductCatalog({ products }: { products: PublicProductDTO[] }) {
  if (!products.length)
    return (
      <div className="catalog-empty card">
        <Box size={36} />
        <h2>Nenhum produto publicado ainda.</h2>
        <p>
          Estamos preparando novas peças. Volte em breve para conhecer nossa
          coleção.
        </p>
      </div>
    );
  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          <div className="product-photo">
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={800}
              height={800}
              unoptimized
            />
          </div>
          <div className="product-card-body">
            <h2>{product.name}</h2>
            <p className="product-description">{product.description}</p>
            <div className="product-offer">
              <strong>{formatBRL(product.price)}</strong>
              <p className="product-payment">
                <CreditCard size={17} aria-hidden="true" />
                <span>{product.paymentTerms}</span>
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
