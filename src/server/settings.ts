import { z } from "zod";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { settingsValuesSchema } from "@/domain/calculation/validation";
import type { SettingsDTO } from "@/domain/calculation/types";
import type { Actor } from "./auth/session";
import { assertAdmin } from "./auth/authorization";
const schema = settingsValuesSchema
  .extend({ expectedVersion: z.number().int().min(0) })
  .strict();
export function settingsDTO(
  row: Awaited<ReturnType<typeof db.calculationSettings.findFirstOrThrow>>,
): SettingsDTO {
  return {
    version: row.version,
    energyRate: row.energyRate.toString(),
    maintenancePercent: row.maintenancePercent.toString(),
    failurePercent: row.failurePercent.toString(),
    finishingPercent: row.finishingPercent.toString(),
    fixation: row.fixation.toString(),
    markupPercent: row.markupPercent.toString(),
  };
}
export async function saveSettings(
  actor: Actor,
  input: unknown,
): Promise<SettingsDTO> {
  assertAdmin(actor);
  const { expectedVersion, ...data } = schema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      if (expectedVersion === 0)
        return settingsDTO(
          await tx.calculationSettings.create({
            data: { ...data, id: 1, updatedById: actor.id },
          }),
        );
      const updated = await tx.calculationSettings.updateMany({
        where: { id: 1, version: expectedVersion },
        data: { ...data, updatedById: actor.id, version: { increment: 1 } },
      });
      if (!updated.count) throw conflict();
      return settingsDTO(
        await tx.calculationSettings.findUniqueOrThrow({ where: { id: 1 } }),
      );
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw conflict();
    throw e;
  }
}
