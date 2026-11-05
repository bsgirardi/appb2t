import { beforeEach, expect, it } from "vitest";
import { setupDatabase } from "../integration/setup";
import { db } from "@/lib/db";
import {
  saveMonthlyGoal,
  readMonthlyGoal,
} from "@/server/profitability/monthly-goals";
const actor = {
  id: "goals-admin",
  name: "Equipe sintética",
  email: "goals@example.test",
  role: "ADMIN" as const,
};
const command = (month: string, version = 0) => ({
  month,
  version,
  values: { revenue: "100.10", contribution: "0", orders: null },
  reason: "Planejamento sintético",
});
setupDatabase();
beforeEach(async () => {
  await db.user.upsert({
    where: { id: actor.id },
    create: { ...actor, passwordHash: "unusable" },
    update: { active: true, role: "ADMIN" },
  });
});
it("persists revisions, clearing and zero independently; rejects stale updates", async () => {
  const month = "2081-01";
  const first = await saveMonthlyGoal(actor, command(month));
  expect(first.version).toBe(1);
  await saveMonthlyGoal(actor, {
    ...command(month, 1),
    values: { revenue: null, contribution: "0", orders: "5" },
  });
  const read = await readMonthlyGoal(actor, { month });
  expect(read.version).toBe(2);
  expect(read.values).toEqual({
    revenue: null,
    contribution: "0.00",
    orders: "5",
  });
  expect(read.history.items.map((r) => r.version)).toEqual([2, 1]);
  expect(read.history.items[1].values.revenue).toBe("100.10");
  await expect(saveMonthlyGoal(actor, command(month, 1))).rejects.toMatchObject(
    { code: "CONFLICT" },
  );
  expect(await db.monthlyGoalRevision.count({ where: { month } })).toBe(2);
});
it("allows exactly one winner for concurrent create and concurrent revision", async () => {
  const month = "2081-02";
  for (const version of [0, 1]) {
    const results = await Promise.allSettled([
      saveMonthlyGoal(actor, command(month, version)),
      saveMonthlyGoal(actor, command(month, version)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
  }
  expect(await db.monthlyGoalRevision.count({ where: { month } })).toBe(2);
});
it("refuses operator, inactive or demoted identity and validates payloads", async () => {
  await expect(
    readMonthlyGoal({ ...actor, role: "OPERATOR" }, { month: "2081-03" }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  await expect(
    saveMonthlyGoal(actor, command("2081-03")),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({
    where: { id: actor.id },
    data: { active: true, role: "OPERATOR" },
  });
  await expect(
    saveMonthlyGoal(actor, command("2081-03")),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({ where: { id: actor.id }, data: { role: "ADMIN" } });
  await expect(
    saveMonthlyGoal(actor, {
      ...command("2081-03"),
      values: { revenue: "-1", orders: null, contribution: null },
    }),
  ).rejects.toThrow();
  expect(await db.monthlyGoal.count({ where: { month: "2081-03" } })).toBe(0);
});
