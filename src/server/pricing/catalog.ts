import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import type { Actor } from "../auth/session";
import { assertAdmin } from "../auth/authorization";
import { printerDTO } from "../catalog-inputs";
import {
  pricingSettingsWriteSchema,
  pricingChannelWriteSchema,
  pricingExtraWriteSchema,
} from "@/domain/pricing/catalog";
import { pricingSettingsSchema, feesSchema } from "@/domain/pricing/validation";
import type {
  PricingCatalogDTO,
  PricingChannelDTO,
  PricingExtraDTO,
} from "@/domain/pricing/types";
export async function getPricingCatalog(
  actor: Actor,
  includeInactive = false,
): Promise<PricingCatalogDTO> {
  if (includeInactive) assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      const [settings, materials, printers, channels, extras] =
        await Promise.all([
          tx.pricingSettings.findUnique({ where: { id: 1 } }),
          tx.material.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
          }),
          tx.printer.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
          }),
          tx.pricingChannel.findMany({
            where: includeInactive ? {} : { active: true },
            orderBy: { name: "asc" },
          }),
          tx.pricingExtra.findMany({
            where: includeInactive ? {} : { active: true },
            orderBy: { name: "asc" },
          }),
        ]);
      return {
        settings: settings
          ? {
              ...pricingSettingsSchema.parse(settings.values),
              version: settings.version,
            }
          : null,
        materials: materials.map((m) => ({ ...m, price: m.price.toString() })),
        printers: printers.map(printerDTO),
        channels: channels.map((c) => ({
          ...c,
          fees: feesSchema.parse(c.fees),
          fixedCost: c.fixedCost.toString(),
        })),
        extras: extras.map((e) => ({ ...e, unitCost: e.unitCost.toString() })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
async function uniqueness<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw conflict();
    throw e;
  }
}
export async function savePricingSettings(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const { expectedVersion, ...values } = pricingSettingsWriteSchema.parse(raw);
  return uniqueness(() =>
    db.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        const row = await tx.pricingSettings.create({
          data: { id: 1, values, updatedById: actor.id },
        });
        return { ...values, version: row.version };
      }
      const updated = await tx.pricingSettings.updateMany({
        where: { id: 1, version: expectedVersion },
        data: { values, updatedById: actor.id, version: { increment: 1 } },
      });
      if (!updated.count) throw conflict();
      return { ...values, version: expectedVersion + 1 };
    }),
  );
}
export async function savePricingChannel(
  actor: Actor,
  raw: unknown,
): Promise<PricingChannelDTO> {
  assertAdmin(actor);
  const { id, expectedVersion, ...data } = pricingChannelWriteSchema.parse(raw);
  return db.$transaction(async (tx) => {
    if (!id) {
      if (expectedVersion !== 0) throw conflict();
      const row = await tx.pricingChannel.create({ data });
      return { ...row, fees: data.fees, fixedCost: row.fixedCost.toString() };
    }
    const updated = await tx.pricingChannel.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    const row = await tx.pricingChannel.findUniqueOrThrow({ where: { id } });
    return { ...row, fees: data.fees, fixedCost: row.fixedCost.toString() };
  });
}
export async function savePricingExtra(
  actor: Actor,
  raw: unknown,
): Promise<PricingExtraDTO> {
  assertAdmin(actor);
  const { id, expectedVersion, ...data } = pricingExtraWriteSchema.parse(raw);
  return db.$transaction(async (tx) => {
    if (!id) {
      if (expectedVersion !== 0) throw conflict();
      const row = await tx.pricingExtra.create({ data });
      return { ...row, unitCost: row.unitCost.toString() };
    }
    const updated = await tx.pricingExtra.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    const row = await tx.pricingExtra.findUniqueOrThrow({ where: { id } });
    return { ...row, unitCost: row.unitCost.toString() };
  });
}
