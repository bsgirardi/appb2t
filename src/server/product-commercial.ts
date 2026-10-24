import type { Product } from "@prisma/client";
import type { ProductInput } from "@/domain/products/types";
import { readProductConfiguration } from "@/domain/products/configuration";
import { AppError } from "@/lib/errors";
import { quantityTiersSchema } from "@/domain/products/quantity-pricing";
import { readCheckoutPolicy } from "@/domain/checkout/policy";
export function productConfigurationForSave(
  input: ProductInput,
  existing: string[],
  old?: Product,
) {
  const config = readProductConfiguration(
    input.configuration ?? old?.configuration,
  );
  const retained = input.images.flatMap((i) => ("id" in i ? [i.id] : []));
  const compositionImageId =
    input.compositionImageId === undefined
      ? old?.compositionImageId
      : input.compositionImageId;
  if (compositionImageId && !existing.includes(compositionImageId))
    throw new AppError(
      "VALIDATION",
      "A foto de composição não pertence a este produto.",
    );
  input.compositionImageId =
    compositionImageId && retained.includes(compositionImageId)
      ? compositionImageId
      : null;
  input.quantityTiers = quantityTiersSchema.parse(
    input.quantityTiers ?? old?.quantityTiers ?? [],
  );
  for (const field of config.fields)
    if (field.type === "SINGLE_CHOICE")
      for (const option of field.options) {
        if (option.imageId && !existing.includes(option.imageId))
          throw new AppError(
            "VALIDATION",
            "A foto da opção não pertence a este produto.",
          );
        if (option.imageId && !retained.includes(option.imageId))
          option.imageId = null;
      }
  return config;
}
export function nextCommercialRevision(old: Product, input: ProductInput) {
  const config = (raw: unknown) => {
    const c = readProductConfiguration(raw);
    return {
      ...c,
      fields: c.fields.map((f) =>
        f.type === "SINGLE_CHOICE"
          ? { ...f, options: f.options.map((o) => ({ ...o, imageId: null })) }
          : f,
      ),
    };
  };
  const keys = [
    "active",
    "name",
    "sku",
    "colors",
    "sizes",
    "availability",
    "leadTimeDays",
    "paymentTerms",
  ] as const;
  const changed =
    JSON.stringify(readCheckoutPolicy(old.checkoutPolicy)) !==
      JSON.stringify(
        input.checkoutPolicy ?? readCheckoutPolicy(old.checkoutPolicy),
      ) ||
    JSON.stringify(
      quantityTiersSchema
        .parse(old.quantityTiers)
        .sort((a, b) => a.minQuantity - b.minQuantity),
    ) !==
      JSON.stringify(
        (input.quantityTiers ?? quantityTiersSchema.parse(old.quantityTiers))
          .slice()
          .sort((a, b) => a.minQuantity - b.minQuantity),
      ) ||
    keys.some(
      (k) =>
        input[k] !== undefined &&
        JSON.stringify(input[k] ?? "") !== JSON.stringify(old[k] ?? ""),
    ) ||
    old.price.toFixed(2) !== input.price ||
    old.publicPriceMode !== (input.publicPriceMode ?? old.publicPriceMode) ||
    JSON.stringify(config(old.configuration)) !==
      JSON.stringify(config(input.configuration ?? old.configuration));
  return old.commercialRevision + (changed ? 1 : 0);
}
