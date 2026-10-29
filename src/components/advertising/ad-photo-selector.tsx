"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdSourceSnapshot } from "@/domain/advertising/types";
export function AdPhotoSelector({
  images,
  selected,
  onChange,
  disabled,
}: {
  images: AdSourceSnapshot["images"];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  function move(index: number, delta: number) {
    const ids = [...selected];
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    onChange(ids);
  }
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
      <legend>Fotos do material — {selected.length} de 10</legend>
      <p>A primeira foto é a capa. Use os botões para mudar a ordem.</p>
      <ol className="grid min-w-0 gap-4 sm:grid-cols-2">
        {selected.map((id, index) => {
          const image = images.find((p) => p.id === id);
          return (
            <li
              key={id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
            >
              {image ? (
                <Image
                  unoptimized
                  src={image.url}
                  alt={`Foto ${index + 1} selecionada`}
                  width={160}
                  height={160}
                  className="h-32 w-full object-contain"
                />
              ) : (
                <p role="status">
                  Foto {index + 1} ausente — remova ou substitua a seleção.
                </p>
              )}
              {index === 0 && <Badge variant="secondary">Capa</Badge>}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || index === 0}
                  aria-label={`Mover foto ${index + 1} para cima`}
                  onClick={() => move(index, -1)}
                >
                  Subir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || index === selected.length - 1}
                  aria-label={`Mover foto ${index + 1} para baixo`}
                  onClick={() => move(index, 1)}
                >
                  Descer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  aria-label={`Remover foto ${index + 1}`}
                  onClick={() => onChange(selected.filter((s) => s !== id))}
                >
                  Remover
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {images.some((i) => !selected.includes(i.id)) && (
        <div className="flex flex-wrap gap-2">
          {images
            .filter((i) => !selected.includes(i.id))
            .map((i) => (
              <Button
                key={i.id}
                type="button"
                variant="outline"
                disabled={disabled || selected.length >= 10}
                onClick={() => onChange([...selected, i.id])}
              >
                Adicionar foto {i.position + 1}
              </Button>
            ))}
        </div>
      )}
    </fieldset>
  );
}
