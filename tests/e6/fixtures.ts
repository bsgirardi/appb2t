import { db } from "@/lib/db";
import sharp from "sharp";
export async function fixture(role: "ADMIN" | "OPERATOR" = "ADMIN") {
  const actor = await db.user.create({
    data: {
      name: "Equipe sintética",
      email: `${role}@example.test`,
      passwordHash: "unusable",
      role,
    },
  });
  const bytes = await sharp({
    create: {
      width: 40,
      height: 20,
      channels: 4,
      background: { r: 0, g: 80, b: 200, alpha: 0.5 },
    },
  })
    .webp()
    .toBuffer();
  const product = await db.product.create({
    data: {
      name: "Peça azul",
      description: "Descrição confirmada",
      paymentTerms: "Pix",
      price: "25",
      calculation: { private: "secret-cost" },
      availability: "MADE_TO_ORDER",
      leadTimeDays: 4,
      images: {
        create: [
          { bytes, mimeType: "image/webp", position: 0 },
          { bytes, mimeType: "image/webp", position: 1 },
        ],
      },
    },
    include: { images: true },
  });
  return { actor, product };
}
