import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { assertAdmin } from "@/server/auth/authorization";
import type { Actor } from "@/server/auth/session";
import {
  commercialSettingsSchema,
  defaultCommercialSettings,
  type CommercialSettingsDTO,
} from "@/domain/opportunities/reply-tracking";
const dto = (row: CommercialSettingsDTO): CommercialSettingsDTO => ({
  replyWaitDays: row.replyWaitDays,
  version: row.version,
});
export async function getCommercialSettings(): Promise<CommercialSettingsDTO> {
  const row = await db.commercialSettings.findUnique({ where: { id: 1 } });
  return row ? dto(row) : { ...defaultCommercialSettings };
}
export async function saveCommercialSettings(
  actor: Actor,
  raw: unknown,
): Promise<CommercialSettingsDTO> {
  assertAdmin(actor);
  const { expectedVersion, replyWaitDays } =
    commercialSettingsSchema.parse(raw);
  try {
    return await db.$transaction(async (tx) => {
      if (expectedVersion === 0)
        return dto(
          await tx.commercialSettings.create({
            data: { id: 1, replyWaitDays, updatedById: actor.id },
          }),
        );
      const result = await tx.commercialSettings.updateMany({
        where: { id: 1, version: expectedVersion },
        data: {
          replyWaitDays,
          updatedById: actor.id,
          version: { increment: 1 },
        },
      });
      if (!result.count) throw conflict();
      return dto(
        await tx.commercialSettings.findUniqueOrThrow({ where: { id: 1 } }),
      );
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw conflict();
    throw e;
  }
}
