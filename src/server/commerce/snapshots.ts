import type { Prisma } from "@prisma/client";
import type { DocumentInput, DocumentSnapshot } from "@/domain/commerce/types";
import { defaultAppearance } from "@/domain/appearance/validation";
import { AppError } from "@/lib/errors";
import { readDocumentArt } from "@/server/art/documents";
export async function createDocumentSnapshot(
  tx: Prisma.TransactionClient,
  input: DocumentInput,
  logoUrl: string,
  owner?: { quoteId: string } | { saleId: string },
  options: { consignmentCustody?: boolean; unidentifiedPos?: boolean } = {},
): Promise<{
  snapshot: DocumentSnapshot;
  logo: { bytes: Uint8Array; mimeType: string } | null;
}> {
  const unidentified =
    options.unidentifiedPos &&
    input.customerId === null &&
    input.customerIdentification === "UNIDENTIFIED";
  const customer = input.customerId
    ? await tx.customer.findUnique({
        where: { id: input.customerId },
      })
    : null;
  if (
    !unidentified &&
    (!customer || (!customer.active && !options.consignmentCustody))
  )
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
    if (item.productId && (!p || (!p.active && !options.consignmentCustody)))
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
      ...(owner
        ? {
            art: (await readDocumentArt(tx, owner, input.items)).map((a) => ({
              ...a,
              lineNumber:
                input.items.findIndex((i) => i.lineId === a.lineKey) + 1,
            })),
          }
        : {}),
      ...(input.catalogKits ? { catalogKits: input.catalogKits } : {}),
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
      customer: unidentified
        ? {
            identification: "UNIDENTIFIED",
            name: "Consumidor não identificado",
            type: "PERSON",
            document: "",
            email: "",
            phone: "",
            address: "",
          }
        : {
            name: customer!.name,
            type: customer!.type,
            document: customer!.document,
            email: customer!.email,
            phone: customer!.phone,
            address: customer!.address,
          },
      items,
      issuedAt: new Date().toISOString(),
    },
    logo: appearance?.logo
      ? { bytes: appearance.logo.bytes, mimeType: appearance.logo.mimeType }
      : null,
  };
}
