import Image from "next/image";
import type { KitGroupSnapshot } from "@/domain/kits/types";
import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";
export function KitReceivedPreview({
  group,
  lines,
}: {
  group: KitGroupSnapshot;
  lines: CatalogLineSnapshot[];
}) {
  return (
    <figure className="kit-received-preview">
      <figcaption>Composição ilustrativa recebida: {group.name}</figcaption>
      <div className="kit-canvas-scroll">
        <div className="kit-canvas-plane" style={{ height: 400 }}>
          {group.placements.map((position) => {
            const line = lines.find((l) => l.lineId === position.lineId),
              image = group.images.find((i) => i.lineId === position.lineId);
            return (
              <div
                className="kit-received-piece"
                key={position.lineId}
                style={{
                  position: "absolute",
                  width: 120,
                  left: `${position.x * 100}%`,
                  top: `${position.y * 100}%`,
                  transform: `translate(${-position.x * 100}%,${-position.y * 100}%)`,
                  zIndex: position.z,
                }}
              >
                {image?.imageUrl && (
                  <Image
                    src={image.imageUrl}
                    alt={line?.name ?? "Componente recebido"}
                    width={120}
                    height={120}
                    unoptimized
                  />
                )}
                <span>
                  {line?.name ?? "Componente recebido"} · {line?.quantity ?? ""}{" "}
                  un.
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="muted">
        Registro visual do envio; sem escala física ou aprovação de arte. As
        linhas recebidas abaixo descrevem cada componente.
      </p>
    </figure>
  );
}
