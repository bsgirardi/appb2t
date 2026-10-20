"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImageDTO } from "@/domain/products/types";
export function ProductCarousel({
  name,
  images,
  selectedImageId,
  onImageChange,
}: {
  name: string;
  images: ProductImageDTO[];
  selectedImageId?: string;
  onImageChange?: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const selected = images.findIndex((i) => i.id === selectedImageId);
  const current = selectedImageId
    ? Math.max(0, selected)
    : Math.min(index, images.length - 1);
  const choose = (photo: number) => {
    setIndex(photo);
    if (images[photo]) onImageChange?.(images[photo].id);
  };
  const next = (direction: number) =>
    choose((current + direction + images.length) % images.length);
  if (!images.length) return null;
  return (
    <div
      role="region"
      aria-label={`Fotos de ${name}`}
      aria-roledescription="carrossel"
      className="product-carousel min-w-0"
      tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={(e) => {
        if (images.length > 1 && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          next(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onTouchStart={(e) => {
        if ((e.target as Element).closest('[aria-label="Escolher foto"]')) {
          touch.current = null;
          return;
        }
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
        <>
          <div
            className="flex max-w-full gap-2 overflow-x-auto py-3"
            aria-label="Escolher foto"
          >
            {images.map((image, photo) => (
              <Button
                key={image.id}
                type="button"
                aria-label={`Ver foto ${photo + 1} de ${name}`}
                aria-pressed={current === photo}
                onClick={() => choose(photo)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-solid bg-white p-1 ${current === photo ? "border-primary" : "border-border"}`}
              >
                <Image
                  src={image.url}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </Button>
            ))}
          </div>
          <div className="carousel-controls">
            <Button
              type="button"
              className=""
              aria-label="Foto anterior"
              onClick={() => next(-1)}
            >
              ←
            </Button>
            <span aria-live="polite">
              {current + 1} / {images.length}
            </span>
            <Button
              type="button"
              className=""
              aria-label="Próxima foto"
              onClick={() => next(1)}
            >
              →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
