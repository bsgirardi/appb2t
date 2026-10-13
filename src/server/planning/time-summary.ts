import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { summarizeTimes } from "@/domain/planning/time-summary";
export async function planningTimeSummary(
  tx: Prisma.TransactionClient,
  batchId: string,
) {
  const b = await tx.planningBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      milestones: true,
      participants: {
        include: {
          reports: {
            include: {
              event: {
                include: {
                  corrections: true,
                  planningReports: {
                    include: { participation: { select: { batchId: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const events = b.milestones.filter(
    (m) => !b.milestones.some((c) => c.sourceId === m.id),
  );
  const start = events.find((m) => m.kind === "PRINT_START")?.instant;
  const end = events.find(
    (m) => m.kind === "PRINT_END" || m.kind === "INTERRUPT",
  )?.instant;
  const actual =
    start && end
      ? new Decimal(end.getTime() - start.getTime()).div(60000).toFixed(6)
      : null;
  return summarizeTimes(
    actual,
    b.participants.every((p) => p.units === p.settledUnits),
    b.participants.flatMap((p) =>
      p.reports.map((l) => ({
        eventId: l.eventId,
        exclusive: l.event.planningReports.every(
          (link) => link.participation.batchId === batchId,
        ),
        machineMinutes:
          l.event.machineMinutes === null
            ? null
            : l.event.corrections
                .reduce(
                  (n, c) => n.plus(c.machineMinutes?.toString() ?? 0),
                  new Decimal(l.event.machineMinutes.toString()),
                )
                .toFixed(),
      })),
    ),
  );
}
