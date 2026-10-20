"use client";
import { useState } from "react";
import type { PublicProductDTO } from "@/domain/products/types";
import { availabilityLabels } from "@/domain/products/commercial";
import { ProductCarousel } from "./product-carousel";
import { ProductContact } from "./product-contact";
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
          <div className="store-commercial-notes">
            <p
              className="store-availability"
              data-availability={product.availability ?? "CONSULT"}
            >
              {availabilityLabels[product.availability ?? "CONSULT"]}
            </p>
            {product.leadTimeDays && (
              <p>
                Produção em até {product.leadTimeDays}{" "}
                {product.leadTimeDays === 1 ? "dia útil" : "dias úteis"}.
                Transporte à parte.
              </p>
            )}
            {product.configuration?.leadTimeCondition && (
              <p>{product.configuration.leadTimeCondition}</p>
            )}
          </div>
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
        <p className="store-note">{product.paymentTerms}</p>
      </div>
    </article>
  );
}
