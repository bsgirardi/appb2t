import { defaultAppearance } from "@/domain/appearance/validation";

import { seedUser } from "../integration/setup";
import { db } from "@/lib/db";
import { productInput } from "./product";
import { createProduct } from "@/server/products";
import { checkoutDraftSchema } from "@/domain/checkout/validation";

export async function checkoutFixture(directEnabled = true) {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    {
      ...productInput,
      checkoutPolicy: {
        directEnabled,
        deliveryModes: ["PICKUP", "TEAM_SHIPPING"],
        externalPaymentInstructions: "Combine o pagamento com a equipe.",
      },
    },
    { a: { bytes: new Uint8Array([1]), mimeType: "image/webp" } },
  );
  await db.companyAppearance.upsert({
    where: { id: 1 },
    create: {
      ...defaultAppearance,
      address: "Rua da Loja, 10",
      updatedById: actor.id,
    },
    update: { address: "Rua da Loja, 10" },
  });
  const draft = checkoutDraftSchema.parse({
    contact: {
      name: "Ana",
      preferredChannel: "email",
      email: "ana@example.test",
      phone: "",
    },
    items: [
      {
        productId: product.id,
        lineId: "ana",
        quantity: 1,
        commercialRevision: product.commercialRevision,
        seenPrice: { kind: "REFERENCE", unit: "75.00", subtotal: "75.00" },
      },
    ],
    delivery: { mode: "PICKUP" },
  });
  return { actor, product, draft };
}
