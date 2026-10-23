import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  createCatalogRequestFixture,
  requestQuoteInput,
} from "../fixtures/catalog-request-db";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import { saveCustomer } from "@/server/customers";
import {
  createArtPackage,
  publishRevision,
  createArtRevision,
} from "@/server/art/revisions";
import { syncDocumentArt, readDocumentArt } from "@/server/art/documents";

setupDatabase();
it("binds separate personalizations to stable commercial identities and invalidates quantity edits without granting duplicates", async () => {
  const { actor, request, lines } = await createCatalogRequestFixture();
  const customer = await saveCustomer(actor, undefined, {
    name: "Ana",
    type: "PERSON",
    active: true,
    document: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  await changeCatalogRequest(actor, request.id, {
    action: "START",
    assigneeId: actor.id,
    expectedVersion: 1,
  });
  const { quote } = await prepareRequestQuote(
    actor,
    request.id,
    requestQuoteInput(customer.id, lines),
  );
  const draft = await createArtPackage(actor, request.id, {
    operationKey: "art-create",
    sourceLineIds: [lines[0].lineId],
    instructions: "Ana",
  });
  await db.artFile.create({
    data: {
      revisionId: draft.id,
      name: "arte.pdf",
      purpose: "FINAL",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1]),
      sha256: "b".repeat(64),
      byteLength: 1,
    },
  });
  const published = await publishRevision(actor, draft.id, 1, "art-publish");
  await db.artDecision.create({
    data: {
      revisionId: published.id,
      action: "APPROVE",
      name: "Ana",
      manifestHash: published.manifestHash!,
      manifest: {},
      operationKey: "approved",
      payloadHash: "a",
    },
  });
  await db.artRevision.update({
    where: { id: published.id },
    data: { state: "APPROVED" },
  });
  const owner = { quoteId: quote.id };
  const items = quote.input.items!;
  const approved = await db.$transaction((tx) =>
    readDocumentArt(tx, owner, items),
  );
  expect(approved.filter((a) => a.required)).toHaveLength(1);
  expect(approved.find((a) => a.lineKey === items[0].lineId)?.applicable).toBe(
    true,
  );
  const edited = [
    { ...items[0], quantity: 2 },
    items[1],
    { ...items[0], lineId: "duplicate" },
  ];
  await db.$transaction((tx) => syncDocumentArt(tx, owner, edited));
  const stale = await db.$transaction((tx) =>
    readDocumentArt(tx, owner, edited),
  );
  expect(stale.find((a) => a.lineKey === items[0].lineId)?.applicable).toBe(
    false,
  );
  expect(stale.find((a) => a.lineKey === "duplicate")?.applicable).toBe(false);
  const duplicateBinding = await db.artDocumentBinding.findFirstOrThrow({
    where: { quoteId: quote.id, lineKey: "duplicate" },
  });
  expect(duplicateBinding.sourceLineId).not.toBe(lines[0].lineId);
  const duplicateArt = await createArtPackage(actor, request.id, {
    operationKey: "duplicate-art",
    sourceLineIds: [duplicateBinding.sourceLineId],
    instructions: "Revisar cópia separadamente",
  });
  expect(duplicateArt.lines).toHaveLength(1);
  const next = await createArtRevision(actor, draft.packageId, {
    operationKey: "art-revised",
    instructions: "Quantidade 2",
  });
  expect(next.lines[0].configurationHash).not.toBe(
    draft.lines[0].configurationHash,
  );
});
