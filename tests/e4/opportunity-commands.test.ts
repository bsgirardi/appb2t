import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { fixture, key } from "./fixtures";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import { db } from "@/lib/db";
setupDatabase();
it("persists history and rejects stale edits and changed replay payloads", async () => {
  const { actor, opportunity: o, fields } = await fixture();
  const payload = {
    action: "INTERACTION",
    operationKey: key(),
    expectedVersion: o.version,
    text: "Conversou com a equipe",
  };
  const updated = await command(actor, o.id, payload);
  expect(updated.nextAction).toBe("Ligar");
  expect(updated.version).toBe(2);
  expect(await command(actor, o.id, payload)).toEqual(updated);
  await expect(
    command(actor, o.id, { ...payload, text: "Outro texto" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    command(actor, o.id, {
      action: "UPDATE",
      operationKey: key(),
      expectedVersion: 1,
      fields,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await db.opportunityEvent.count({ where: { opportunityId: o.id } }),
  ).toBe(2);
});
it("keeps inactive identities without requiring reassignment for unrelated updates", async () => {
  const { actor, opportunity: o, fields } = await fixture();
  const owner = await seedUser("OPERATOR", "owner@example.test");
  let next = await command(actor, o.id, {
    action: "UPDATE",
    operationKey: key(),
    expectedVersion: o.version,
    fields: { ...fields, ownerId: owner.id },
  });
  await db.user.update({ where: { id: owner.id }, data: { active: false } });
  await db.customer.update({
    where: { id: fields.customerId },
    data: { active: false },
  });
  next = await command(actor, o.id, {
    action: "UPDATE",
    operationKey: key(),
    expectedVersion: next.version,
    fields: { ...fields, ownerId: owner.id, title: "Atualizado" },
  });
  expect(next.owner.active).toBe(false);
  expect(next.customer.active).toBe(false);
  const prior = await db.opportunityEvent.findMany({
    where: { opportunityId: o.id },
    orderBy: { createdAt: "asc" },
  });
  expect(prior[0].actorName).toBe(actor.name);
});
it("requires loss reason and reopens to levantamento with next action", async () => {
  const { actor, opportunity: o } = await fixture();
  const lost = await command(actor, o.id, {
    action: "LOSE",
    operationKey: key(),
    expectedVersion: 1,
    reason: "Preço incompatível",
  });
  expect(lost.stage).toBe("PERDIDO");
  expect(lost.nextAction).toBeNull();
  const interaction = await command(actor, o.id, {
    action: "INTERACTION",
    operationKey: key(),
    expectedVersion: lost.version,
    text: "Recebido novo interesse",
  });
  const opened = await command(actor, o.id, {
    action: "REOPEN",
    operationKey: key(),
    expectedVersion: interaction.version,
    reason: "Novo interesse",
    nextAction: "Levantar demanda",
    nextContactDate: "2026-10-29",
  });
  expect(opened.stage).toBe("LEVANTAMENTO");
  expect(opened.lossReason).toBeNull();
});
