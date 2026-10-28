import { raceUnderPlanningLock } from "./race";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { quoteFixture } from "./checkout-quote-fixture";
import { key } from "./fixtures";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import { getOpportunity } from "@/server/opportunities/queries";
import {
  publishCheckoutQuote,
  acceptCheckoutQuote,
  withdrawCheckoutOffer,
} from "@/server/checkout/quotes";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { db } from "@/lib/db";
setupDatabase();
async function linked() {
  const f = await quoteFixture();
  const o = await command(f.actor, undefined, {
    action: "CREATE",
    operationKey: key(),
    fields: {
      title: "Oferta E4",
      customerId: f.q.input.customerId,
      ownerId: f.actor.id,
      stage: "CONTATO",
      nextAction: "Retornar",
      nextContactDate: todaySaoPaulo(new Date()),
      pendingNotes: "PRIVADO-E4",
    },
  });
  const opportunity = await command(f.actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: o.version,
    quoteId: f.q.id,
  });
  return { ...f, opportunity };
}
const installments = () => [
  { number: 1, amount: "90.00", dueDate: todaySaoPaulo(new Date()) },
];
it("guards loss for request-linked active offers and gains on private acceptance without leaking notes", async () => {
  const { actor, p, q, id, opportunity: o } = await linked();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: key(),
    expectedQuoteVersion: q.version,
    installments: installments(),
  });
  expect(JSON.stringify(offer)).not.toContain("PRIVADO-E4");
  await expect(
    command(actor, o.id, {
      action: "LOSE",
      operationKey: key(),
      expectedVersion: o.version,
      reason: "Cliente desistiu",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const input = {
    operationKey: key(),
    expectedVersion: offer.version,
    fingerprint: offer.fingerprint,
    name: "Ana",
    agreed: true as const,
  };
  const receipt = await acceptCheckoutQuote(p, input);
  expect((await getOpportunity(actor, o.id)).stage).toBe("GANHO");
  expect(JSON.stringify(receipt)).not.toContain("PRIVADO-E4");
  expect(await acceptCheckoutQuote(p, input)).toEqual(receipt);
  expect(await db.sale.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
  const event = await db.opportunityEvent.findFirstOrThrow({
    where: { opportunityId: o.id, type: "WON" },
  });
  expect(event.authorKind).toBe("CHECKOUT");
});
it("requires withdrawal before loss and blocks another publication until reopening", async () => {
  const { actor, q, id, opportunity: o } = await linked();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: key(),
    expectedQuoteVersion: q.version,
    installments: installments(),
  });
  await withdrawCheckoutOffer(actor, id, offer.version, "Proposta retirada");
  const lost = await command(actor, o.id, {
    action: "LOSE",
    operationKey: key(),
    expectedVersion: o.version,
    reason: "Sem retorno",
  });
  await expect(
    publishCheckoutQuote(actor, id, {
      operationKey: key(),
      expectedQuoteVersion: q.version,
      installments: installments(),
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await command(actor, o.id, {
    action: "REOPEN",
    operationKey: key(),
    expectedVersion: lost.version,
    reason: "Cliente retornou",
    nextAction: "Revisar proposta",
    nextContactDate: todaySaoPaulo(new Date()),
  });
  await expect(
    publishCheckoutQuote(actor, id, {
      operationKey: key(),
      expectedQuoteVersion: q.version,
      installments: installments(),
    }),
  ).resolves.toBeTruthy();
});
it("serializes loss versus publishing and acceptance without a lost sold opportunity", async () => {
  const { actor, p, q, id, opportunity: o } = await linked();
  const results = await raceUnderPlanningLock([
    () =>
      publishCheckoutQuote(actor, id, {
        operationKey: key(),
        expectedQuoteVersion: q.version,
        installments: installments(),
      }),
    () =>
      command(actor, o.id, {
        action: "LOSE",
        operationKey: key(),
        expectedVersion: o.version,
        reason: "Não seguirá",
      }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  for (const result of results)
    if (result.status === "rejected")
      expect(result.reason).toMatchObject({ code: "CONFLICT" });
  const first = results[0];
  if (first.status === "fulfilled") {
    const offer = first.value;
    const acceptance = await raceUnderPlanningLock([
      () =>
        acceptCheckoutQuote(p, {
          operationKey: key(),
          expectedVersion: offer.version,
          fingerprint: offer.fingerprint,
          name: "Ana",
          agreed: true,
        }),
      () =>
        command(actor, o.id, {
          action: "LOSE",
          operationKey: key(),
          expectedVersion: o.version,
          reason: "Não seguirá",
        }),
    ]);
    expect(acceptance[0].status).toBe("fulfilled");
    expect(acceptance[1].status).toBe("rejected");
    if (acceptance[1].status === "rejected")
      expect(acceptance[1].reason).toMatchObject({ code: "CONFLICT" });
    expect((await getOpportunity(actor, o.id)).stage).toBe("GANHO");
  } else {
    expect((await getOpportunity(actor, o.id)).stage).toBe("PERDIDO");
    expect(await db.sale.count()).toBe(0);
  }
});
it("rolls back approval, conversion and installments when gain persistence fails", async () => {
  const { actor, p, q, id, opportunity: o } = await linked();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: key(),
    expectedQuoteVersion: q.version,
    installments: installments(),
  });
  await db.$executeRawUnsafe(
    "ALTER TABLE \"Opportunity\" ADD CONSTRAINT e4_test_no_gain CHECK (stage <> 'GANHO')",
  );
  try {
    await expect(
      acceptCheckoutQuote(p, {
        operationKey: key(),
        expectedVersion: offer.version,
        fingerprint: offer.fingerprint,
        name: "Ana",
        agreed: true,
      }),
    ).rejects.toThrow();
    expect(await db.sale.count()).toBe(0);
    expect(await db.saleInstallment.count()).toBe(0);
    expect(await db.financialEntry.count()).toBe(0);
    expect(
      (await db.quote.findUniqueOrThrow({ where: { id: q.id } })).status,
    ).toBe("ENVIADO");
    expect((await getOpportunity(actor, o.id)).stage).toBe("CONTATO");
  } finally {
    await db.$executeRawUnsafe(
      'ALTER TABLE "Opportunity" DROP CONSTRAINT e4_test_no_gain',
    );
  }
});

it("blocks loss when the active offer is linked ONLY by catalog request", async () => {
  const { actor, q, id, opportunity: o } = await linked();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: key(),
    expectedQuoteVersion: q.version,
    installments: installments(),
  });
  await db.checkout.update({ where: { id }, data: { quoteId: null } });
  const beforeEvents = await db.opportunityEvent.count({
    where: { opportunityId: o.id },
  });
  await expect(
    command(actor, o.id, {
      action: "LOSE",
      operationKey: key(),
      expectedVersion: o.version,
      reason: "Cliente desistiu",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await getOpportunity(actor, o.id)).version).toBe(o.version);
  expect(
    await db.opportunityEvent.count({ where: { opportunityId: o.id } }),
  ).toBe(beforeEvents);
  await withdrawCheckoutOffer(actor, id, offer.version, "Oferta retirada");
  expect(
    (
      await command(actor, o.id, {
        action: "LOSE",
        operationKey: key(),
        expectedVersion: o.version,
        reason: "Cliente desistiu",
      })
    ).stage,
  ).toBe("PERDIDO");
});

it("keeps a single sale when administrative conversion competes with private acceptance", async () => {
  const { actor, p, q, id, opportunity: o } = await linked();
  let second = await saveQuote(actor, undefined, q.input);
  second = await transitionQuote(actor, second.id, second.version, "ISSUE");
  second = await transitionQuote(actor, second.id, second.version, "APPROVE");
  const linkedSecond = await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: o.version,
    quoteId: second.id,
  });
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: key(),
    expectedQuoteVersion: q.version,
    installments: installments(),
  });
  const results = await raceUnderPlanningLock([
    () => convertQuote(actor, second.id, second.version, installments(), key()),
    () =>
      acceptCheckoutQuote(p, {
        operationKey: key(),
        expectedVersion: offer.version,
        fingerprint: offer.fingerprint,
        name: "Ana",
        agreed: true,
      }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  for (const result of results)
    if (result.status === "rejected")
      expect(result.reason).toMatchObject({ code: "CONFLICT" });
  const won = await getOpportunity(actor, o.id);
  expect(won.stage).toBe("GANHO");
  expect(won.version).toBe(linkedSecond.version + 1);
  expect(await db.sale.count()).toBe(1);
  expect(await db.saleInstallment.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
});
