import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveCalendar, saveMachineSettings } from "@/server/planning/calendars";
import { planningFixture, planningMeta } from "../fixtures/planning";
setupDatabase();
it("authorizes calendar changes, preserves cost parameters and detects concurrent edits", async () => {
  const { actor, printer } = await planningFixture();
  const operator = await seedUser("OPERATOR", "op@planning.test");
  const input = {
    ...(await planningMeta()),
    resource: "TEAM",
    printerId: null,
    weekly: [{ weekday: 1, startMinute: 480, endMinute: 1080 }],
    exceptions: [],
  };
  await expect(saveCalendar(operator, input)).rejects.toThrow();
  const result = await saveCalendar(actor, input);
  expect(result.weekly[0].startMinute).toBe(480);
  expect(await saveCalendar(actor, input)).toEqual(result);
  await expect(saveCalendar(actor, { ...input, weekly: [] })).rejects.toThrow();
  const before = await db.printer.findUniqueOrThrow({
    where: { id: printer.id },
  });
  await saveMachineSettings(actor, {
    ...(await planningMeta()),
    printerId: printer.id,
    prepareMinutes: "5",
    removeMinutes: "10",
  });
  expect(
    await db.printer.findUniqueOrThrow({ where: { id: printer.id } }),
  ).toEqual(before);
  expect(
    (await db.planningState.findUniqueOrThrow({ where: { id: 1 } })).revision,
  ).toBe(input.expectedRevision + 2);
  expect(await db.planningAudit.count()).toBe(2);
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  await expect(saveCalendar(actor, input)).rejects.toThrow();
});
