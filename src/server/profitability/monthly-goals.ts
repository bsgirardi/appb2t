import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { aggregateSales } from "@/domain/profitability/aggregate";
import {
  emptyGoals,
  goalValuesSchema,
  monthlyQuerySchema,
  saveMonthlyGoalSchema,
  monthPeriod,
  monthlyPerformance,
} from "@/domain/profitability/monthly-goals";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import { requireProfitabilityAdmin } from "./authorization";
import { getProfitabilityReport } from "./queries";

export async function saveMonthlyGoal(actor: Actor, raw: unknown) {
  await requireProfitabilityAdmin(actor);
  const input = saveMonthlyGoalSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await lockOperation(tx, `monthly-goal:${input.month}`);
    // Recheck the persisted identity inside the write transaction.
    const user = await tx.user.findUnique({ where: { id: actor.id } });
    if (!user?.active || user.role !== "ADMIN") {
      throw new AppError("FORBIDDEN", "Acesso não autorizado.");
    }
    const previous = await tx.monthlyGoal.findUnique({
      where: { month: input.month },
    });
    if ((previous?.version ?? 0) !== input.version) throw conflict();
    const version = input.version + 1;
    const data = { version, values: input.values };
    if (previous)
      await tx.monthlyGoal.update({ where: { month: input.month }, data });
    else await tx.monthlyGoal.create({ data: { month: input.month, ...data } });
    await tx.monthlyGoalRevision.create({
      data: {
        month: input.month,
        ...data,
        reason: input.reason,
        actorId: user.id,
        actorName: user.name,
      },
    });
    return { month: input.month, ...data };
  });
}

export async function readMonthlyGoal(actor: Actor, raw: unknown) {
  await requireProfitabilityAdmin(actor);
  const { month, page } = monthlyQuerySchema.parse(raw);
  const readAt = new Date();
  const period = monthPeriod(month, todaySaoPaulo(readAt));
  const saved = await db.$transaction(
    async (tx) => {
      const current = await tx.monthlyGoal.findUnique({ where: { month } });
      const items = await tx.monthlyGoalRevision.findMany({
        where: { month },
        orderBy: { version: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      });
      return {
        version: current?.version ?? 0,
        values: current
          ? goalValuesSchema.parse(current.values)
          : { ...emptyGoals },
        history: {
          page,
          total: current?.version ?? 0,
          items: items.map((r) => ({
            version: r.version,
            values: goalValuesSchema.parse(r.values),
            reason: r.reason,
            actorName: r.actorName,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
  const summary =
    period.state === "future"
      ? aggregateSales([]).summary
      : (
          await getProfitabilityReport(actor, {
            from: period.from,
            to: period.to,
            situation: "NORMAL",
          })
        ).summary;
  return {
    editorId: actor.id,
    month,
    ...saved,
    period,
    summary,
    performance: monthlyPerformance(summary, saved.values, period),
    readAt: readAt.toISOString(),
  };
}
export type MonthlyGoalDTO = Awaited<ReturnType<typeof readMonthlyGoal>>;
