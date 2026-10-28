import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { simulateQueue, type QueuePreview } from "@/domain/planning/scenario";
import { loadPlanningInput } from "./forecast-input";
import { planningFingerprint } from "./preview-validity";
export const queueScenarioSchema = z.object({ printerId: z.string().min(1), batchIds: z.array(z.string().min(1)).max(10000) }).strict();
export async function previewQueue(actor: Actor, raw: unknown): Promise<QueuePreview> {
  const scenario = queueScenarioSchema.parse(raw);
  return db.$transaction(async tx => {
    const asOf = new Date().toISOString();
    const input = await loadPlanningInput(tx, actor, asOf);
    return { ...simulateQueue(input, scenario), asOf, revision: input.revision,
      expiresAt: new Date(Date.parse(asOf) + 60000).toISOString(), fingerprint: planningFingerprint(input, scenario) };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
