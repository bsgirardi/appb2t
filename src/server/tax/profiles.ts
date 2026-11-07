import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { assertAdmin } from "@/server/auth/authorization";
import type { Actor } from "@/server/auth/session";
import {
  taxProfileSchema,
  taxWriteSchema,
  publicTaxProfileSchema,
} from "@/domain/tax/validation";
import { assertProfilePeriod } from "@/domain/tax/periods";
import type { TaxCatalog, TaxProfilesDTO } from "@/domain/tax/types";
export async function readTaxProfiles(
  tx: Prisma.TransactionClient,
): Promise<TaxProfilesDTO> {
  const [state, rows] = await Promise.all([
    tx.taxProfileState.findUnique({ where: { id: 1 } }),
    tx.taxProfileRevision.findMany({ orderBy: { revision: "asc" } }),
  ]);
  return {
    version: state?.version ?? 0,
    profiles: rows.map((r) => ({
      ...taxProfileSchema.parse({
        ...(r.values as object),
        id: r.id,
        revision: r.revision,
        replacesId: r.replacesId,
      }),
      actorName: r.actorName,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
export async function readTaxCatalog(
  tx: Prisma.TransactionClient,
): Promise<TaxCatalog> {
  const full = await readTaxProfiles(tx);
  return {
    version: full.version,
    profiles: full.profiles.map((p) =>
      publicTaxProfileSchema.parse({
        id: p.id,
        revision: p.revision,
        regime: p.regime,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        percent: p.percent,
        scope: p.scope,
        replacesId: p.replacesId,
      }),
    ),
  };
}
export async function getTaxProfiles(actor: Actor) {
  assertAdmin(actor);
  return db.$transaction((tx) => readTaxProfiles(tx), {
    isolationLevel: "RepeatableRead",
  });
}
export async function saveTaxProfile(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const { expectedVersion, ...values } = taxWriteSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await tx.taxProfileState.upsert({
      where: { id: 1 },
      create: { id: 1, version: 0 },
      update: {},
    });
    const locked = await tx.taxProfileState.updateMany({
      where: { id: 1, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (!locked.count) throw conflict();
    const previous = await readTaxProfiles(tx);
    assertProfilePeriod(previous.profiles, { id: "new", ...values });
    await tx.taxProfileRevision.create({
      data: {
        revision: expectedVersion + 1,
        values,
        replacesId: values.replacesId,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    return readTaxProfiles(tx);
  });
}
export async function taxEvidence(
  tx: Prisma.TransactionClient,
  profileId?: string,
) {
  if (!profileId) return undefined;
  const row = await tx.taxProfileRevision.findUniqueOrThrow({
    where: { id: profileId },
  });
  return {
    profileId: row.id,
    revision: row.revision,
    values: row.values,
    actorId: row.actorId,
    actorName: row.actorName,
    recordedAt: row.createdAt.toISOString(),
  } as Prisma.InputJsonValue;
}
