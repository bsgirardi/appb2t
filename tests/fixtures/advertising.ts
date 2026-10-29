import { makeAdSource } from "@/domain/advertising/source";
import type { AdDraftDTO } from "@/domain/advertising/types";
export function adDraft(): AdDraftDTO {
  const source = makeAdSource({
    id: "p1",
    version: 1,
    name: "Peça azul",
    sku: "P-1",
    active: true,
    shortDescription: "Presente",
    description: "Descrição confirmada",
    specifications: "12,5 cm",
    colors: [],
    sizes: [],
    availability: "MADE_TO_ORDER",
    leadTimeDays: 5,
    minimumQuantity: 1,
    personalizable: false,
    images: [
      { id: "i1", url: "/photo1.webp", position: 0 },
      { id: "i2", url: "/photo2.webp", position: 1 },
    ],
  });
  return {
    id: "d1",
    productId: "p1",
    channel: "INSTAGRAM",
    internalName: "Campanha",
    title: "Peça azul",
    body: "Meu texto",
    imageIds: ["i1", "i2"],
    status: "DRAFT",
    version: 1,
    source,
    currentSource: source,
    productChanged: false,
    missingPhotoIds: [],
    reviewIsCurrent: false,
    reviewedAt: null,
    updatedAt: "2026-10-29T12:00:00.000Z",
    lastExport: null,
  };
}
