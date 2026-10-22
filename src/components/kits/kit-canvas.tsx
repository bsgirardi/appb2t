"use client";
import Image from "next/image";
import { useId, useRef, useState, type PointerEvent } from "react";
import type { KitPlacement } from "@/domain/kits/types";
export type KitCanvasLine = {
  lineId: string;
  name: string;
  quantity: number;
  imageUrl: string | null;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function KitCanvas({
  lines,
  placements,
  onMove,
  onReorder,
  onSelect,
  selectedLineId,
  zoom = 1,
}: {
  lines: KitCanvasLine[];
  placements: KitPlacement[];
  onMove: (lineId: string, x: number, y: number) => void;
  onReorder?: (lineId: string, direction: "front" | "back") => void;
  onSelect?: (lineId: string) => void;
  selectedLineId?: string | null;
  zoom?: number;
}) {
  const help = useId(),
    plane = useRef<HTMLDivElement>(null),
    drag = useRef<{
      id: string;
      pointer: number;
      clientX: number;
      clientY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
  const [preview, setPreview] = useState<{
    lineId: string;
    x: number;
    y: number;
  } | null>(null);
  function move(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    setPreview({
      lineId: start.id,
      x: clamp(start.x + (event.clientX - start.clientX) / start.width),
      y: clamp(start.y + (event.clientY - start.clientY) / start.height),
    });
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    drag.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel)
      onMove(
        start.id,
        clamp(start.x + (event.clientX - start.clientX) / start.width),
        clamp(start.y + (event.clientY - start.clientY) / start.height),
      );
  }
  return (
    <section className="kit-canvas-section">
      <h2>Sua composição</h2>
      <p id={help} className="store-note">
        Selecione uma peça e arraste ou use as setas do teclado e os botões de
        posição. A quantidade é alterada somente na lista de peças.
      </p>
      <div
        className="kit-canvas-scroll"
        role="region"
        aria-label="Composição ilustrativa do kit"
        tabIndex={0}
      >
        <div
          ref={plane}
          className="kit-canvas-plane"
          style={{ width: `${Math.max(1, zoom) * 100}%`, height: 400 * zoom }}
        >
          {lines.map((line) => {
            const saved = placements.find((p) => p.lineId === line.lineId) ?? {
                lineId: line.lineId,
                x: 0.5,
                y: 0.5,
                z: 0,
              },
              position = preview?.lineId === line.lineId ? preview : saved;
            return (
              <button
                type="button"
                key={line.lineId}
                className="kit-piece"
                aria-label={`Mover ${line.name}, ${line.quantity} unidades`}
                aria-describedby={help}
                aria-pressed={selectedLineId === line.lineId}
                style={{
                  left: `${position.x * 100}%`,
                  top: `${position.y * 100}%`,
                  transform: `translate(${-position.x * 100}%, ${-position.y * 100}%)`,
                  zIndex: saved.z,
                  width: 120 * zoom,
                }}
                onClick={() => onSelect?.(line.lineId)}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  onSelect?.(line.lineId);
                  const rect = plane.current?.getBoundingClientRect(),
                    node = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  drag.current = {
                    id: line.lineId,
                    pointer: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    x: saved.x,
                    y: saved.y,
                    width: Math.max(1, rect.width - node.width),
                    height: Math.max(1, rect.height - node.height),
                  };
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={move}
                onPointerUp={(event) => finish(event)}
                onPointerCancel={(event) => finish(event, true)}
                onLostPointerCapture={(event) => finish(event, true)}
                onKeyDown={(event) => {
                  const directions: Record<string, [number, number]> = {
                    ArrowLeft: [-0.02, 0],
                    ArrowRight: [0.02, 0],
                    ArrowUp: [0, -0.02],
                    ArrowDown: [0, 0.02],
                  };
                  const delta = directions[event.key];
                  if (delta) {
                    event.preventDefault();
                    onSelect?.(line.lineId);
                    onMove(
                      line.lineId,
                      clamp(saved.x + delta[0]),
                      clamp(saved.y + delta[1]),
                    );
                  } else if (
                    event.key === "PageUp" ||
                    event.key === "PageDown"
                  ) {
                    event.preventDefault();
                    onReorder?.(
                      line.lineId,
                      event.key === "PageUp" ? "front" : "back",
                    );
                  }
                }}
              >
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    width={120}
                    height={120}
                    draggable={false}
                    unoptimized
                  />
                ) : (
                  <span className="kit-image-missing">Foto indisponível</span>
                )}
                <span>{line.name}</span>
                <strong>{line.quantity} un.</strong>
              </button>
            );
          })}
          {!lines.length && (
            <p className="kit-canvas-empty">
              Escolha uma peça para começar sua composição.
            </p>
          )}
        </div>
      </div>
      <p className="store-note">
        Uma foto por configuração, mesmo para várias unidades. Fotos, posições e
        tamanhos na tela não representam escala física nem arte aprovada.
      </p>
    </section>
  );
}
