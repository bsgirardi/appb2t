import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { fixture, key } from "./fixtures";
import { db } from "@/lib/db";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import { getCommercialDashboard } from "@/server/dashboard/commercial";
import {
  getCommercialSettings,
  saveCommercialSettings,
} from "@/server/commercial-settings";
import { resolveDashboardFilter, shiftDay } from "@/domain/dashboard/filters";
import { todaySaoPaulo } from "@/domain/commerce/dates";
setupDatabase();
async function linked() {
  const f = await fixture();
  const q = await f.quote();
  const o = await command(f.actor, f.opportunity.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: f.opportunity.version,
    quoteId: q.id,
  });
  return { ...f, q, o };
}
it("persists explicit send/reply, idempotency and first-unanswered deadline for both roles", async () => {
  const { actor, q, o } = await linked();
  const operator = await seedUser("OPERATOR", "reply-operator@test.invalid");
  const payload = {
    action: "PROPOSAL_SENT",
    text: "Envio efetivamente realizado",
    quoteId: q.id,
    quoteVersion: q.version,
    operationKey: key(),
    expectedVersion: o.version,
  };
  let next = await command(operator, o.id, payload);
  expect(await command(operator, o.id, payload)).toEqual(next);
  expect(
    await db.opportunityEvent.count({
      where: { opportunityId: o.id, type: "PROPOSAL_SENT" },
    }),
  ).toBe(1);
  const today = todaySaoPaulo(new Date());
  const since = shiftDay(today, -14);
  await db.opportunityEvent.updateMany({
    where: { opportunityId: o.id, type: "PROPOSAL_SENT" },
    data: { createdAt: new Date(`${since}T15:00:00Z`) },
  });
  const filter = resolveDashboardFilter({ panel: "commercial" }, "ADMIN");
  for (const role of ["ADMIN", "OPERATOR"] as const) {
    const p = await getCommercialDashboard({ ...actor, role }, filter);
    expect(p.metrics.find((m) => m.id === "unanswered")?.value).toBe("1");
    expect(
      p.priorities.filter((p) => p.href === `/negociacoes/${o.id}`),
    ).toHaveLength(1);
  }
  next = await command(operator, o.id, {
    ...payload,
    expectedVersion: next.version,
    operationKey: key(),
  });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("1");
  next = await command(operator, o.id, {
    ...payload,
    action: "CUSTOMER_REPLY",
    expectedVersion: next.version,
    operationKey: key(),
  });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("0");
  expect(next.nextAction).toBe(o.nextAction);
});
it("default 14 and saved admin preference apply to current waits; concurrent writes conflict", async () => {
  const { actor, q, o } = await linked();
  expect(await getCommercialSettings()).toEqual({
    replyWaitDays: 14,
    version: 0,
  });
  await command(actor, o.id, {
    action: "PROPOSAL_SENT",
    text: "Envio",
    quoteId: q.id,
    quoteVersion: q.version,
    operationKey: key(),
    expectedVersion: o.version,
  });
  const today = todaySaoPaulo(new Date());
  await db.opportunityEvent.updateMany({
    where: { opportunityId: o.id, type: "PROPOSAL_SENT" },
    data: { createdAt: new Date(`${shiftDay(today, -14)}T15:00:00Z`) },
  });
  await expect(
    saveCommercialSettings(
      { ...actor, role: "OPERATOR" },
      { replyWaitDays: 7, expectedVersion: 0 },
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const outcomes = await Promise.allSettled([
    saveCommercialSettings(actor, { replyWaitDays: 30, expectedVersion: 0 }),
    saveCommercialSettings(actor, { replyWaitDays: 30, expectedVersion: 0 }),
  ]);
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (
      await getCommercialDashboard(
        actor,
        resolveDashboardFilter({ panel: "commercial" }, "ADMIN"),
      )
    ).metrics.find((m) => m.id === "unanswered")?.value,
  ).toBe("0");
});
it("rejects stale/secondary/terminal send and does not resurrect older quote revision", async () => {
  const { actor, q, o } = await linked();
  const payload = {
    action: "PROPOSAL_SENT",
    text: "Envio",
    quoteId: q.id,
    quoteVersion: q.version,
    operationKey: key(),
    expectedVersion: o.version,
  };
  await expect(
    command(actor, o.id, { ...payload, quoteVersion: q.version + 1 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    command(actor, o.id, { ...payload, quoteId: "other" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  let next = await command(actor, o.id, payload);
  await db.opportunityEvent.updateMany({
    where: { opportunityId: o.id, type: "PROPOSAL_SENT" },
    data: {
      createdAt: new Date(
        `${shiftDay(todaySaoPaulo(new Date()), -14)}T15:00:00Z`,
      ),
    },
  });
  await db.quote.update({
    where: { id: q.id },
    data: { version: { increment: 1 } },
  });
  const panel = await getCommercialDashboard(
    actor,
    resolveDashboardFilter({ panel: "commercial" }, "ADMIN"),
  );
  expect(panel.metrics.find((m) => m.id === "unanswered")?.value).toBe("0");
  next = await command(actor, o.id, {
    action: "LOSE",
    reason: "Encerrada no teste",
    operationKey: key(),
    expectedVersion: next.version,
  });
  await expect(
    command(actor, o.id, {
      ...payload,
      quoteVersion: q.version + 1,
      expectedVersion: next.version,
      operationKey: key(),
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});

it("changing principal back or reopening never resurrects a historical unanswered send", async () => {
  const { actor, q, o, quote } = await linked();
  let next = await command(actor, o.id, {
    action: "PROPOSAL_SENT",
    text: "Envio inicial",
    quoteId: q.id,
    quoteVersion: q.version,
    operationKey: key(),
    expectedVersion: o.version,
  });
  await db.opportunityEvent.updateMany({
    where: { opportunityId: o.id, type: "PROPOSAL_SENT" },
    data: {
      createdAt: new Date(
        `${shiftDay(todaySaoPaulo(new Date()), -14)}T15:00:00Z`,
      ),
    },
  });
  const filter = resolveDashboardFilter({ panel: "commercial" }, "ADMIN");
  const second = await quote();
  next = await command(actor, o.id, {
    action: "LINK_QUOTE",
    quoteId: second.id,
    operationKey: key(),
    expectedVersion: next.version,
  });
  // Selecting the same primary is not a response and must not silence the alert.
  next = await command(actor, o.id, {
    action: "SET_PRIMARY",
    quoteId: q.id,
    operationKey: key(),
    expectedVersion: next.version,
  });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("1");
  for (const quoteId of [second.id, q.id])
    next = await command(actor, o.id, {
      action: "SET_PRIMARY",
      quoteId,
      operationKey: key(),
      expectedVersion: next.version,
    });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("0");
  next = await command(actor, o.id, {
    action: "PROPOSAL_SENT",
    text: "Novo envio",
    quoteId: q.id,
    quoteVersion: q.version,
    operationKey: key(),
    expectedVersion: next.version,
  });
  // Preserve event order relative to primary changes, ageing the full synthetic timeline consistently.
  const events = await db.opportunityEvent.findMany({
    where: { opportunityId: o.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (let i = 0; i < events.length; i++)
    await db.opportunityEvent.update({
      where: { id: events[i].id },
      data: {
        createdAt: new Date(
          `${shiftDay(todaySaoPaulo(new Date()), -14)}T15:00:${String(i).padStart(2, "0")}Z`,
        ),
      },
    });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("1");
  next = await command(actor, o.id, {
    action: "LOSE",
    reason: "Perda sintética",
    operationKey: key(),
    expectedVersion: next.version,
  });
  next = await command(actor, o.id, {
    action: "REOPEN",
    reason: "Reabertura sintética",
    nextAction: "Ligar novamente",
    nextContactDate: todaySaoPaulo(new Date()),
    operationKey: key(),
    expectedVersion: next.version,
  });
  expect(
    (await getCommercialDashboard(actor, filter)).metrics.find(
      (m) => m.id === "unanswered",
    )?.value,
  ).toBe("0");
});
