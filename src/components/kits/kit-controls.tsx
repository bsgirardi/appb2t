"use client";
import { Button } from "@/components/ui/button";
export function KitControls({
  selected,
  onMove,
  onReorder,
  onZoom,
  onReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  selected: boolean;
  onMove: (dx: number, dy: number) => void;
  onReorder: (direction: "front" | "back") => void;
  onZoom: (amount: number) => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="kit-controls">
      <fieldset>
        <legend>Posição da peça selecionada</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "esquerda", dx: -0.02, dy: 0 },
            { name: "direita", dx: 0.02, dy: 0 },
            { name: "cima", dx: 0, dy: -0.02 },
            { name: "baixo", dx: 0, dy: 0.02 },
          ].map((move) => (
            <Button
              key={move.name}
              type="button"
              className="min-h-11"
              variant="outline"
              disabled={!selected}
              onClick={() => onMove(move.dx, move.dy)}
            >
              Mover para{" "}
              {move.name === "cima" || move.name === "baixo" ? "" : "a "}
              {move.name}
            </Button>
          ))}
          <Button
            type="button"
            className="min-h-11"
            variant="outline"
            disabled={!selected}
            onClick={() => onReorder("front")}
          >
            Trazer à frente
          </Button>
          <Button
            type="button"
            className="min-h-11"
            variant="outline"
            disabled={!selected}
            onClick={() => onReorder("back")}
          >
            Enviar para trás
          </Button>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          variant="outline"
          onClick={() => onZoom(0.25)}
        >
          Ampliar composição
        </Button>
        <Button
          type="button"
          className="min-h-11"
          variant="outline"
          onClick={() => onZoom(-0.25)}
        >
          Reduzir composição
        </Button>
        <Button
          type="button"
          className="min-h-11"
          variant="outline"
          onClick={onReset}
        >
          Reenquadrar
        </Button>
        <Button
          type="button"
          className="min-h-11"
          variant="outline"
          disabled={!canUndo}
          onClick={onUndo}
        >
          Desfazer
        </Button>
        <Button
          type="button"
          className="min-h-11"
          variant="outline"
          disabled={!canRedo}
          onClick={onRedo}
        >
          Refazer
        </Button>
      </div>
    </div>
  );
}
