"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Field } from "@/components/ui/field";
export interface GalleryDraft {
  id?: string;
  uploadKey?: string;
  file?: File;
  url: string;
}
export function ProductGalleryEditor({
  value,
  onChange,
  onError,
}: {
  value: GalleryDraft[];
  onChange: (value: GalleryDraft[]) => void;
  onError: (message: string) => void;
}) {
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  function add(files: FileList | null) {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (value.length + incoming.length > 10) {
      onError("Cada produto aceita até 10 fotos.");
      return;
    }
    if (
      incoming.some(
        (f) =>
          !f.size ||
          f.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(f.type),
      )
    ) {
      onError("Envie fotos JPEG, PNG ou WebP de até 5 MiB cada.");
      return;
    }
    onError("");
    onChange([
      ...value,
      ...incoming.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { file, url, uploadKey: crypto.randomUUID() };
      }),
    ]);
  }
  function move(index: number, direction: number) {
    const next = [...value];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <div className="gallery-editor">
      <Field
        label="Fotos do produto"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        hint="De 1 a 10 fotos · até 5 MiB cada. A primeira será a capa."
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <ol className="gallery-thumbnails">
        {value.map((photo, index) => (
          <li key={photo.id ?? photo.uploadKey}>
            <Image
              src={photo.url}
              width={140}
              height={140}
              unoptimized
              alt={`Prévia da foto ${index + 1} do produto`}
            />
            <span>{index === 0 ? "Capa" : `Foto ${index + 1}`}</span>
            <div className="gallery-controls">
              <Button
                variant="outline"
                size="sm"
                type="button"
                className=""
                disabled={index === 0}
                aria-label={`Mover foto ${index + 1} para antes`}
                onClick={() => move(index, -1)}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className=""
                disabled={index === value.length - 1}
                aria-label={`Mover foto ${index + 1} para depois`}
                onClick={() => move(index, 1)}
              >
                →
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className=""
                aria-label={`Remover foto ${index + 1}`}
                onClick={() => {
                  if (photo.file) {
                    URL.revokeObjectURL(photo.url);
                    urls.current.delete(photo.url);
                  }
                  onChange(value.filter((_, i) => i !== index));
                }}
              >
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
