import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { fixture, key } from "./fixtures";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import {
  listOpportunities,
  listOpportunityEvents,
} from "@/server/opportunities/queries";
setupDatabase();
it("combines private search and due filters with stable pagination", async () => {
  const { actor, opportunity: o } = await fixture();
  const rows = await listOpportunities(actor, {
    search: "Lote",
    owner: "eu",
    due: "hoje",
    pageSize: 1,
  });
  expect(rows.total).toBe(1);
  expect(rows.items[0].id).toBe(o.id);
  const events = await listOpportunityEvents(actor, o.id, { pageSize: 1 });
  expect(events.total).toBe(1);
  await command(actor, o.id, {
    action: "LOSE",
    operationKey: key(),
    expectedVersion: 1,
    reason: "Prazo incompatível",
  });
  expect((await listOpportunities(actor, {})).total).toBe(0);
  expect((await listOpportunities(actor, { stage: "todas" })).total).toBe(1);
});
