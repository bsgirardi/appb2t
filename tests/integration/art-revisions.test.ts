import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createCatalogRequestFixture } from "../fixtures/catalog-request-db";
import {
  createArtPackage,
  createArtRevision,
  publishRevision,
  updateArtDraft,
} from "@/server/art/revisions";

setupDatabase();
async function fixture() {
  const { actor, request, lines } = await createCatalogRequestFixture();
  const revision = await createArtPackage(actor, request.id, {
    operationKey: "create-package",
    sourceLineIds: [lines[0].lineId],
    instructions: "Revise o nome Ana",
  });
  return { actor, request, lines, revision };
}
async function attach(revisionId: string) {
  await db.artFile.create({
    data: {
      revisionId,
      name: "arte.png",
      purpose: "FINAL",
      mimeType: "image/png",
      bytes: new Uint8Array([1]),
      sha256: "b".repeat(64),
      byteLength: 1,
    },
  });
}

it("publishes immutable evidence and a new draft leaves the previous revision current", async () => {
  const { actor, revision } = await fixture();
  await attach(revision.id);
  const published = await publishRevision(
    actor,
    revision.id,
    revision.version,
    "publish-1",
  );
  expect(published.state).toBe("AWAITING_CUSTOMER");
  expect(published.manifestHash).toMatch(/^[a-f0-9]{64}$/);
  await expect(
    updateArtDraft(actor, revision.id, {
      expectedVersion: published.version,
      instructions: "mudança",
      operationKey: "edit-published",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const draft = await createArtRevision(actor, revision.packageId, {
    operationKey: "next-draft",
    instructions: "Correção",
  });
  expect(draft.number).toBe(2);
  expect(
    (
      await db.artPackage.findUniqueOrThrow({
        where: { id: revision.packageId },
      })
    ).currentRevisionId,
  ).toBe(revision.id);
  await attach(draft.id);
  await publishRevision(actor, draft.id, draft.version, "publish-2");
  expect(
    (await db.artRevision.findUniqueOrThrow({ where: { id: revision.id } }))
      .state,
  ).toBe("SUPERSEDED");
});

it("requires final files, enforces line exclusivity and retains the requirement after an attempted competing package", async () => {
  const { actor, revision, request, lines } = await fixture();
  await expect(
    publishRevision(actor, revision.id, revision.version, "publish-empty"),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(
    createArtPackage(actor, request.id, {
      operationKey: "competing",
      sourceLineIds: [lines[0].lineId],
      instructions: "",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await db.artLineRequirement.count({
      where: { requestId: request.id, required: true },
    }),
  ).toBe(1);
});

it("recovers identical operations and rejects changed payloads under the same key", async () => {
  const { actor, request, lines, revision } = await fixture();
  const retry = await createArtPackage(actor, request.id, {
    operationKey: "create-package",
    sourceLineIds: [lines[0].lineId],
    instructions: "Revise o nome Ana",
  });
  expect(retry).toEqual(revision);
  await expect(
    createArtPackage(actor, request.id, {
      operationKey: "create-package",
      sourceLineIds: [lines[1].lineId],
      instructions: "Outra",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.artPackage.count()).toBe(1);
});

it("rejects a twenty-first revision without deleting earlier evidence", async () => {
  const { actor, revision } = await fixture();
  for (let n = 2; n <= 20; n++)
    await createArtRevision(actor, revision.packageId, {
      operationKey: `revision-${n}`,
      instructions: "",
    });
  await expect(
    createArtRevision(actor, revision.packageId, {
      operationKey: "revision-21",
      instructions: "",
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.artRevision.count()).toBe(20);
});
