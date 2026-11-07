import { AppError } from "@/lib/errors";
import { competenceSchema } from "./validation";
export type Period = {
  id: string;
  startsAt: string;
  endsAt: string;
  replacesId: string | null;
};
export function activeTaxProfiles<T extends Period>(rows: T[]): T[] {
  const replaced = new Set(
    rows.flatMap((r) => (r.replacesId ? [r.replacesId] : [])),
  );
  return rows.filter((r) => !replaced.has(r.id));
}
export function resolveTaxProfile<
  T extends { startsAt: string; endsAt: string; replacesId?: string | null },
>(rows: T[], competence: string): T | null {
  competenceSchema.parse(competence);
  const replaced = new Set(
    rows.flatMap((r) => (r.replacesId ? [r.replacesId] : [])),
  );
  const matches = rows.filter(
    (r) =>
      !("id" in r && replaced.has(r.id as string)) &&
      r.startsAt <= competence &&
      r.endsAt >= competence,
  );
  if (matches.length > 1)
    throw new AppError(
      "CONFLICT",
      "Perfis fiscais com vigências sobrepostas. Revise a configuração.",
    );
  return matches[0] ?? null;
}
export function assertProfilePeriod(rows: Period[], next: Period): void {
  const active = activeTaxProfiles(rows);
  if (next.replacesId && !active.some((r) => r.id === next.replacesId))
    throw new AppError(
      "CONFLICT",
      "A revisão substituída não está mais ativa.",
    );
  if (
    active.some(
      (r) =>
        r.id !== next.replacesId &&
        r.startsAt <= next.endsAt &&
        r.endsAt >= next.startsAt,
    )
  )
    throw new AppError(
      "VALIDATION",
      "Vigências sobrepostas: substitua explicitamente a revisão anterior.",
    );
}
