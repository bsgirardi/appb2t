import { z } from "zod";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { storefrontSchema } from "@/domain/appearance/storefront";
import { seoSchema } from "@/domain/marketing/seo";
import { analyticsSchema } from "@/domain/marketing/analytics";
import { assertAdmin } from "./auth/authorization";
import type { Actor } from "./auth/session";
import { defaultAppearance } from "@/domain/appearance/validation";
const schema = z
  .object({
    expectedVersion: z.number().int().min(0),
    seo: seoSchema,
    analytics: analyticsSchema,
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(170),
  })
  .strict();
export async function saveMarketingSettings(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const input = schema.parse(raw);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:appearance'))`;
    const old = await tx.companyAppearance.findUnique({ where: { id: 1 } });
    if ((old?.version ?? 0) !== input.expectedVersion) throw conflict();
    const storefront = {
      ...storefrontSchema.parse(old?.storefront ?? {}),
      seo: input.seo,
      analytics: input.analytics,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    };
    const row = old
      ? await tx.companyAppearance.update({
          where: { id: 1 },
          data: {
            storefront,
            updatedById: actor.id,
            version: { increment: 1 },
          },
        })
      : await tx.companyAppearance.create({
          data: {
            ...defaultAppearance,
            id: 1,
            storefront,
            updatedById: actor.id,
          },
        });
    return { storefront, version: row.version };
  });
}
