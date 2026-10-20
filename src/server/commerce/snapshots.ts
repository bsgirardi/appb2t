import type { Prisma } from "@prisma/client";
import type { DocumentInput, DocumentSnapshot } from "@/domain/commerce/types";
import { defaultAppearance } from "@/domain/appearance/validation";
import { AppError } from "@/lib/errors";
export async function createDocumentSnapshot(
  tx: Prisma.TransactionClient,
  input: DocumentInput,
  logoUrl: string,
): Promise<{
  snapshot: DocumentSnapshot;
  logo: { bytes: Uint8Array; mimeType: string } | null;
}> {
  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer?.active)
    throw new AppError("VALIDATION", "Selecione um cliente ativo.");
  const appearance = await tx.companyAppearance.findUnique({
    where: { id: 1 },
    include: { logo: true },
  });
  const a = appearance ?? defaultAppearance;
  const products = await tx.product.findMany({
    where: {
      id: {
        in: input.items.flatMap((i) => (i.productId ? [i.productId] : [])),
      },
    },
  });
  const items = input.items.map((item) => {
    const p = products.find((p) => p.id === item.productId);
    if (item.productId && !p?.active)
      throw new AppError("VALIDATION", "Um produto não está mais ativo.");
    return {
      ...(item.catalogOrigin ? { catalogOrigin: item.catalogOrigin } : {}),
      ...(item.productId ? { productId: item.productId } : {}),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      name: p?.name ?? item.description,
    };
  });
  return {
    snapshot: {
      company: {
        name: a.name,
        shortName: a.shortName,
        slogan: a.slogan,
        email: a.email,
        phone: a.phone,
        address: a.address,
        footer: a.footer,
        logoUrl: appearance?.logo ? logoUrl : null,
      },
      customer: {
        name: customer.name,
        type: customer.type,
        document: customer.document,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      items,
      issuedAt: new Date().toISOString(),
    },
    logo: appearance?.logo
      ? { bytes: appearance.logo.bytes, mimeType: appearance.logo.mimeType }
      : null,
  };
}
