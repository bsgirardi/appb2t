import { db } from "@/lib/db";
import { z } from "zod";
import { storefrontSchema } from "@/domain/appearance/storefront";
import { defaultAppearance } from "@/domain/appearance/validation";
import {
  instagramSettingsSchema,
  newestInstagramPosts,
  type InstagramSettings,
} from "@/domain/marketing/instagram";
import { instagramSeedPosts } from "@/domain/marketing/instagram-seed";
import { InstagramError, fetchInstagramPosts } from "./instagram-client";
import { conflict } from "@/lib/errors";
import { assertAdmin } from "./auth/authorization";
import type { Actor } from "./auth/session";
export const INSTAGRAM_INTERVAL_MS = 15 * 60 * 1000;
export function instagramConnection() {
  return {
    configured:
      !!process.env.INSTAGRAM_ACCESS_TOKEN &&
      /^v\d{1,2}\.\d$/.test(process.env.INSTAGRAM_API_VERSION ?? "v27.0"),
    automaticEnabled: process.env.INSTAGRAM_SYNC_ENABLED === "true",
  };
}
export function instagramPosts(settings?: InstagramSettings, limit = 6) {
  const value = settings ?? instagramSettingsSchema.parse({});
  return value.enabled
    ? newestInstagramPosts(
        value.posts ?? instagramSeedPosts,
        value.hiddenIds,
        limit,
      )
    : [];
}
export function instagramSyncDue(settings?: InstagramSettings) {
  const current = instagramSettingsSchema.parse(settings ?? {});
  const connection = instagramConnection();
  if (
    !current.enabled ||
    !connection.configured ||
    !connection.automaticEnabled
  )
    return false;
  const interval = current.lastError ? 5 * 60 * 1000 : INSTAGRAM_INTERVAL_MS;
  return (
    !current.lastAttemptAt ||
    Date.now() - Date.parse(current.lastAttemptAt) >= interval
  );
}
let pending: Promise<void> | undefined;
async function writeSyncResult(
  posts: Awaited<ReturnType<typeof fetchInstagramPosts>> | undefined,
  error?: InstagramSettings["lastError"],
) {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:appearance'))`;
    const row = await tx.companyAppearance.findUnique({ where: { id: 1 } });
    if (!row) return;
    const storefront = storefrontSchema.parse(row.storefront);
    const current = instagramSettingsSchema.parse(storefront.instagram ?? {});
    if (!current.enabled) return;
    const instagram = {
      ...current,
      ...(posts !== undefined
        ? {
            posts,
            lastSuccessAt: new Date().toISOString(),
            lastError: undefined,
          }
        : { lastError: error ?? "unavailable" }),
    };
    await tx.companyAppearance.update({
      where: { id: 1 },
      data: { storefront: { ...storefront, instagram } },
    });
  });
}
export async function syncInstagram(force = false): Promise<void> {
  if (pending) return pending;
  const connection = instagramConnection();
  if (!connection.configured || !connection.automaticEnabled) return;
  pending = (async () => {
    const claimed = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:appearance'))`;
      const row = await tx.companyAppearance.findUnique({ where: { id: 1 } });
      if (!row) return false;
      const storefront = storefrontSchema.parse(row.storefront),
        settings = instagramSettingsSchema.parse(storefront.instagram ?? {});
      if (
        !settings.enabled ||
        (settings.lastAttemptAt &&
          Date.now() - Date.parse(settings.lastAttemptAt) < 60000) ||
        (!force && !instagramSyncDue(settings))
      )
        return false;
      await tx.companyAppearance.update({
        where: { id: 1 },
        data: {
          storefront: {
            ...storefront,
            instagram: { ...settings, lastAttemptAt: new Date().toISOString() },
          },
        },
      });
      return true;
    });
    if (!claimed) return;
    try {
      await writeSyncResult(
        await fetchInstagramPosts(
          process.env.INSTAGRAM_ACCESS_TOKEN!,
          process.env.INSTAGRAM_API_VERSION ?? "v27.0",
        ),
      );
    } catch (error) {
      await writeSyncResult(
        undefined,
        error instanceof InstagramError ? error.code : "unavailable",
      );
    }
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
export async function saveInstagramSettings(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const input = z
    .object({
      expectedVersion: z.number().int().min(0),
      enabled: z.boolean(),
      hiddenIds: instagramSettingsSchema.shape.hiddenIds,
    })
    .strict()
    .parse(raw);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:appearance'))`;
    const row = await tx.companyAppearance.findUnique({ where: { id: 1 } });
    if ((row?.version ?? 0) !== input.expectedVersion) throw conflict();
    const storefront = storefrontSchema.parse(row?.storefront ?? {}),
      settings = instagramSettingsSchema.parse(storefront.instagram ?? {});
    const instagram = {
      ...settings,
      enabled: input.enabled,
      hiddenIds: input.hiddenIds,
    };
    const next = { ...storefront, instagram };
    const saved = row
      ? await tx.companyAppearance.update({
          where: { id: 1 },
          data: {
            storefront: next,
            version: { increment: 1 },
            updatedById: actor.id,
          },
        })
      : await tx.companyAppearance.create({
          data: {
            ...defaultAppearance,
            storefront: next,
            id: 1,
            updatedById: actor.id,
          },
        });
    return { version: saved.version, settings: instagram };
  });
}
