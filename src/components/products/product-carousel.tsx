"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImageDTO } from "@/domain/products/types";
export function ProductCarousel({
  name,
  images,
}: {
  name: string;
  images: ProductImageDTO[];
}) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = Math.min(index, images.length - 1);
  const next = (direction: number) =>
    setIndex((i) => (i + direction + images.length) % images.length);
  if (!images.length) return null;
  return (
    <div
      role="region"
      aria-label={`Fotos de ${name}`}
      aria-roledescription="carrossel"
      className="product-carousel"
      tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={(e) => {
        if (images.length > 1 && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          next(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start || images.length < 2) return;
        const t = e.changedTouches[0],
          dx = t.clientX - start.x,
          dy = t.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
          next(dx < 0 ? 1 : -1);
      }}
    >
      <div className="product-photo">
        <Image
          src={images[current].url}
          alt={`${name} — foto ${current + 1} de ${images.length}`}
          width={800}
          height={800}
          unoptimized
        />
      </div>
      {images.length > 1 && (
        <div className="carousel-controls">
          <button
            type="button"
            className="button secondary"
            aria-label="Foto anterior"
            onClick={() => next(-1)}
          >
            ←
          </button>
          <span aria-live="polite">
            {current + 1} / {images.length}
          </span>
          <button
            type="button"
            className="button secondary"
            aria-label="Próxima foto"
            onClick={() => next(1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
