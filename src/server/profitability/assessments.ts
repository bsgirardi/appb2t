import { Prisma, type ProfitabilityAssessment } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assessmentSchema } from "@/domain/profitability/validation";
import { calculateSale } from "@/domain/profitability/calculate";
import type {
  AssessmentDTO,
  SaleProfitabilityInput,
  SaleProfitabilityDTO,
} from "@/domain/profitability/types";
import { requireProfitabilityAdmin } from "./authorization";
import { runProfitabilityCommand } from "./commands";
import { readSaleSources } from "./sources";
const dto = (r: ProfitabilityAssessment): AssessmentDTO => ({
  ...r,
  input: r.input as unknown as SaleProfitabilityInput,
  result: r.result as unknown as SaleProfitabilityDTO,
  createdAt: r.createdAt.toISOString(),
});
export async function recordAssessment(
  actor: Actor,
  raw: unknown,
): Promise<AssessmentDTO> {
  const v = assessmentSchema.parse(raw);
  await requireProfitabilityAdmin(actor);
  // Capture a consistent, read-only view before serializing the idempotent write.
  return runProfitabilityCommand(actor, "ASSESSMENT", v, async (tx) => {
    const [input] = await db.$transaction(
      (readTx) => readSaleSources(readTx, [v.saleId]),
      { isolationLevel: "RepeatableRead", timeout: 30000 },
    );
    const result = calculateSale(input),
      engineVersion = "u4-v1";
    const r = await tx.profitabilityAssessment.upsert({
      where: {
        saleId_engineVersion_factsHash: {
          saleId: v.saleId,
          engineVersion,
          factsHash: input.factsHash,
        },
      },
      create: {
        saleId: v.saleId,
        engineVersion,
        factsHash: input.factsHash,
        input: input as unknown as Prisma.InputJsonValue,
        result: result as unknown as Prisma.InputJsonValue,
        actorId: actor.id,
      },
      update: {},
    });
    return dto(r);
  });
}
export async function getAssessment(
  actor: Actor,
  id: string,
): Promise<AssessmentDTO> {
  await requireProfitabilityAdmin(actor);
  const row = await db.profitabilityAssessment.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Apuração não encontrada.");
  return dto(row);
}
export async function listAssessments(
  actor: Actor,
  saleId: string,
): Promise<AssessmentDTO[]> {
  await requireProfitabilityAdmin(actor);
  return (
    await db.profitabilityAssessment.findMany({
      where: { saleId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
  ).map(dto);
}
