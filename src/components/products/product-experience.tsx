"use client";
import { useState } from "react";
import type { PublicProductDTO } from "@/domain/products/types";
import { availabilityLabels } from "@/domain/products/commercial";
import { ProductCarousel } from "./product-carousel";
import { ProductContact } from "./product-contact";
import { ProductProductionTime } from "./product-production-time";
export function ProductExperience({
  product,
  phone,
  email,
  url,
  backHref,
  editLineId,
}: {
  product: PublicProductDTO;
  phone: string;
  email: string;
  url: string;
  backHref: string;
  editLineId?: string;
}) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  return (
    <article className="store-product-experience">
      <div className="store-product-visual">
        <ProductCarousel
          name={product.name}
          images={product.images}
          selectedImageId={selectedImageId ?? product.images[0]?.id}
          onImageChange={setSelectedImageId}
        />
        <p className="store-image-caption">
          Imagem ilustrativa da oferta. O texto personalizado não é simulado na
          foto.
        </p>
        <section className="store-product-story">
          <h2>Sobre esta peça</h2>
          <p>{product.description}</p>
          {product.configuration?.included && (
            <>
              <h3>O que acompanha</h3>
              <p>{product.configuration.included}</p>
            </>
          )}
          {product.specifications && (
            <>
              <h3>Especificações</h3>
              <p>{product.specifications}</p>
            </>
          )}
        </section>
      </div>
      <div className="store-product-choices">
        <header>
          <p className="store-product-brand">B2T · Ideias em 3D</p>
          <h1>{product.name}</h1>
          {product.sku && <p className="store-sku">Código: {product.sku}</p>}
          {product.shortDescription && (
            <p className="store-short-description">
              {product.shortDescription}
            </p>
          )}
          <section
            className="store-commercial-notes"
            aria-label="Condições da peça"
          >
            <h2 className="font-semibold">Condições da peça</h2>
            <p
              className="store-availability"
              data-availability={product.availability ?? "CONSULT"}
            >
              {availabilityLabels[product.availability ?? "CONSULT"]}
            </p>
            <ProductProductionTime days={product.leadTimeDays} />
            {product.configuration?.leadTimeCondition && (
              <p>{product.configuration.leadTimeCondition}</p>
            )}
            {product.paymentTerms && <p>{product.paymentTerms}</p>}
          </section>
        </header>
        <ProductContact
          product={product}
          phone={phone}
          email={email}
          url={url}
          editLineId={editLineId}
          backHref={backHref}
          onOptionImage={setSelectedImageId}
        />
      </div>
    </article>
  );
}
