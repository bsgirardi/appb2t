import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  createCatalogRequestFixture,
  requestQuoteInput,
} from "../fixtures/catalog-request-db";
import {
  createArtPackage,
  publishRevision,
  moveArtLine,
} from "@/server/art/revisions";
import { getQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { saveCustomer } from "@/server/customers";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { readDocumentArt } from "@/server/art/documents";
import type { ArtRevisionDTO } from "@/domain/art/types";

setupDatabase();
async function approve(
  actor: Parameters<typeof publishRevision>[0],
  revision: ArtRevisionDTO,
) {
  await db.artFile.create({
    data: {
      revisionId: revision.id,
      name: "arte.pdf",
      purpose: "FINAL",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1]),
      sha256: "b".repeat(64),
      byteLength: 1,
    },
  });
  const published = await publishRevision(
    actor,
    revision.id,
    revision.version,
    `publish-${revision.id}`,
  );
  await db.artDecision.create({
    data: {
      revisionId: revision.id,
      action: "APPROVE",
      name: "Cliente",
      manifestHash: published.manifestHash!,
      manifest: {},
      operationKey: "approve-art",
      payloadHash: "hash",
    },
  });
  await db.artRevision.update({
    where: { id: revision.id },
    data: { state: "APPROVED" },
  });
}
async function prepare(
  f: Awaited<ReturnType<typeof createCatalogRequestFixture>>,
  description?: string,
) {
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Cliente",
    type: "PERSON",
    active: true,
  });
  await changeCatalogRequest(f.actor, f.request.id, {
    action: "START",
    assigneeId: f.actor.id,
    expectedVersion: 1,
  });
  const input = requestQuoteInput(customer.id, f.lines);
  if (description) input.document.items[0].description = description;
  return (await prepareRequestQuote(f.actor, f.request.id, input)).quote;
}
it("keeps prior approval when the first commercial document uses the exact approved description and quantity", async () => {
  const f = await createCatalogRequestFixture();
  const revision = await createArtPackage(f.actor, f.request.id, {
    operationKey: "before-quote",
    sourceLineIds: [f.lines[0].lineId],
    instructions: "Revisar",
  });
  await approve(f.actor, revision);
  const quote = await prepare(f, revision.lines[0].description);
  expect((await getQuote(f.actor, quote.id)).art?.[0].applicable).toBe(true);
});
it("enables approval explicitly on a pre-C4 converted sale without rewriting historical snapshots", async () => {
  const f = await createCatalogRequestFixture();
  let quote = await prepare(f);
  quote = await transitionQuote(f.actor, quote.id, quote.version, "ISSUE");
  quote = await transitionQuote(f.actor, quote.id, quote.version, "APPROVE");
  const sale = await convertQuote(
    f.actor,
    quote.id,
    quote.version,
    [{ number: 1, amount: quote.totals!.total, dueDate: "2099-12-01" }],
    "convert-before-c4",
  );
  await db.artDocumentBinding.deleteMany();
  const before = (await db.sale.findUniqueOrThrow({ where: { id: sale.id } }))
    .snapshot;
  const revision = await createArtPackage(f.actor, f.request.id, {
    operationKey: "enable-old-sale",
    sourceLineIds: [f.lines[0].lineId],
    instructions: "Revisar venda existente",
  });
  await approve(f.actor, revision);
  expect(
    (
      await db.$transaction((tx) =>
        readDocumentArt(tx, { saleId: sale.id }, sale.document.items),
      )
    )[0].applicable,
  ).toBe(true);
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: sale.id } })).snapshot,
  ).toEqual(before);
});
it("bounds aggregate packages even when the same line is repeatedly detached", async () => {
  const f = await createCatalogRequestFixture();
  for (let n = 0; n < 20; n++) {
    const revision = await createArtPackage(f.actor, f.request.id, {
      operationKey: `quota-package-${n}`,
      sourceLineIds: [f.lines[0].lineId],
      instructions: "",
    });
    await moveArtLine(f.actor, f.request.id, {
      operationKey: `quota-detach-${n}`,
      sourceLineId: f.lines[0].lineId,
      expectedPackageId: revision.packageId,
      targetPackageId: null,
    });
  }
  await expect(
    createArtPackage(f.actor, f.request.id, {
      operationKey: "quota-overflow",
      sourceLineIds: [f.lines[0].lineId],
      instructions: "",
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.artPackage.count()).toBe(20);
});
