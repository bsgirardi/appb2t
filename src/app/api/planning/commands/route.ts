import { z } from "zod";
import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { planningBody, planningEndpoint } from "@/server/planning/http";
import { saveCalendar, saveMachineSettings } from "@/server/planning/calendars";
import {
  saveBatch,
  confirmBatch,
  scheduleBatch,
} from "@/server/planning/batches";
import { setBatchCoverage } from "@/server/planning/materials";
import {
  recordMilestone,
  correctMilestone,
  reorderQueue,
  cancelBatch,
} from "@/server/planning/milestones";
import { reconcileBatch } from "@/server/planning/reconciliation";
const actions = {
  CALENDAR_SAVE: saveCalendar,
  MACHINE_SETTINGS: saveMachineSettings,
  BATCH_SAVE: saveBatch,
  BATCH_CONFIRM: confirmBatch,
  BATCH_SCHEDULE: scheduleBatch,
  BATCH_COVERAGE: setBatchCoverage,
  MILESTONE: recordMilestone,
  MILESTONE_CORRECT: correctMilestone,
  QUEUE_REORDER: reorderQueue,
  BATCH_CANCEL: cancelBatch,
  BATCH_RECONCILE: reconcileBatch,
};
const schema = z
  .object({
    action: z.enum(
      Object.keys(actions) as [
        keyof typeof actions,
        ...(keyof typeof actions)[],
      ],
    ),
    payload: z.unknown(),
  })
  .strict();
export async function POST(request: Request) {
  return planningEndpoint(async () => {
    const actor = await requireActor();
    const v = schema.parse(await planningBody(request));
    return ok(await actions[v.action](actor, v.payload));
  });
}
