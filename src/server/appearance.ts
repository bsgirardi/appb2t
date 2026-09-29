import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "./auth/authorization";
import type { Actor } from "./auth/session";
import type { NormalizedImage } from "./product-images";
import type {
  AppearanceDTO,
  PublicAppearanceDTO,
} from "@/domain/appearance/types";
import {
  appearanceSchema,
  defaultAppearance,
} from "@/domain/appearance/validation";
const publicSelect = {
  name: true,
  shortName: true,
  slogan: true,
  email: true,
  phone: true,
  address: true,
  footer: true,
  lightPrimary: true,
  lightAccent: true,
  darkPrimary: true,
  darkAccent: true,
} as const;
export async function getPublicAppearance(): Promise<PublicAppearanceDTO> {
  const row = await db.companyAppearance.findUnique({
    where: { id: 1 },
    select: { ...publicSelect, logo: { select: { cacheKey: true } } },
  });
  if (!row) return { ...defaultAppearance, logoUrl: null };
  const { logo, ...fields } = row;
  return {
    ...fields,
    logoUrl: logo ? `/api/appearance/logo?asset=${logo.cacheKey}` : null,
  };
}
export async function getAppearance(actor: Actor): Promise<AppearanceDTO> {
  assertAdmin(actor);
  const row = await db.companyAppearance.findUnique({
    where: { id: 1 },
    select: {
      ...publicSelect,
      version: true,
      logo: { select: { cacheKey: true } },
    },
  });
  if (!row) return { ...defaultAppearance, version: 0, logoUrl: null };
  const { logo, ...fields } = row;
  return {
    ...fields,
    logoUrl: logo ? `/api/appearance/logo?asset=${logo.cacheKey}` : null,
  };
}
export async function saveAppearance(
  actor: Actor,
  raw: unknown,
  logo?: NormalizedImage,
): Promise<AppearanceDTO> {
  assertAdmin(actor);
  const { expectedVersion, removeLogo, ...data } = appearanceSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:appearance'))`;
    const old = await tx.companyAppearance.findUnique({ where: { id: 1 } });
    if ((old?.version ?? 0) !== expectedVersion) throw conflict();
    const row = old
      ? await tx.companyAppearance.update({
          where: { id: 1 },
          data: { ...data, updatedById: actor.id, version: { increment: 1 } },
        })
      : await tx.companyAppearance.create({
          data: { ...data, id: 1, updatedById: actor.id },
        });
    if (removeLogo)
      await tx.companyLogo.deleteMany({ where: { appearanceId: 1 } });
    if (logo) {
      const data = {
        cacheKey: randomUUID(),
        bytes: Buffer.from(logo.bytes),
        mimeType: logo.mimeType,
      };
      await tx.companyLogo.upsert({
        where: { appearanceId: 1 },
        create: { appearanceId: 1, ...data },
        update: data,
      });
    }
    const savedLogo = await tx.companyLogo.findUnique({
      where: { appearanceId: 1 },
      select: { cacheKey: true },
    });
    return {
      ...data,
      version: row.version,
      logoUrl: savedLogo
        ? `/api/appearance/logo?asset=${savedLogo.cacheKey}`
        : null,
    };
  });
}
export async function getAppearanceLogo(): Promise<NormalizedImage> {
  const row = await db.companyLogo.findUnique({ where: { appearanceId: 1 } });
  if (!row) throw new AppError("NOT_FOUND", "Logo não encontrado.");
  return { bytes: row.bytes, mimeType: "image/webp" };
}
