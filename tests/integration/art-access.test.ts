import { beforeEach, expect, it, vi, afterEach } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createCatalogRequestFixture } from "../fixtures/catalog-request-db";
import {
  createArtPackage,
  publishRevision,
  createArtRevision,
} from "@/server/art/revisions";
import {
  issueArtAccess,
  exchangeArtToken,
  readArtReview,
  revokeArtAccess,
  readPublicArtFile,
} from "@/server/art/access";
import { decideArt } from "@/server/art/decisions";

setupDatabase();
beforeEach(() => vi.stubEnv("ART_ACCESS_KEY", "a".repeat(64)));
afterEach(() => vi.unstubAllEnvs());
async function fixture() {
  const { actor, request, lines } = await createCatalogRequestFixture();
  const draft = await createArtPackage(actor, request.id, {
    operationKey: "create-package",
    sourceLineIds: [lines[0].lineId],
    instructions: "Confira Ana",
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
  const revision = await publishRevision(
    actor,
    draft.id,
    draft.version,
    "publish-art",
  );
  const link = await issueArtAccess(
    actor,
    revision.id,
    revision.version,
    "issue-link",
  );
  const token = new URL(link.url).hash.slice(1);
  const session = await exchangeArtToken(token);
  return { actor, revision, link, token, session };
}
it("keeps the secret in a URL fragment, stores only hashes and confines session access", async () => {
  const { actor, revision, link, token, session } = await fixture();
  expect(new URL(link.url).search).toBe("");
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(
    await issueArtAccess(actor, revision.id, revision.version, "issue-link"),
  ).toEqual(link);
  const review = await readArtReview(session.sessionToken, revision.id);
  expect(review.instructions).toBe("Confira Ana");
  expect(JSON.stringify(review)).not.toContain(token);
  expect(JSON.stringify(await db.artCommand.findMany())).not.toContain(token);
  expect(
    await readPublicArtFile(
      session.sessionToken,
      revision.id,
      revision.files[0].id,
    ),
  ).toMatchObject({ mimeType: "application/pdf" });
  await expect(
    readArtReview(session.sessionToken, "another-revision"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await revokeArtAccess(actor, revision.id, "revoke-link");
  await expect(
    readArtReview(session.sessionToken, revision.id),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(exchangeArtToken(token)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("expires access on the server and renewal revokes previous sessions", async () => {
  const { actor, revision, token, session } = await fixture();
  await db.artAccessGrant.updateMany({ data: { expiresAt: new Date(0) } });
  await expect(exchangeArtToken(token)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await issueArtAccess(actor, revision.id, revision.version, "renew-link");
  await expect(
    readArtReview(session.sessionToken, revision.id),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("keeps a previously authorized decision receipt after replacement without exposing old files", async () => {
  const { actor, revision, session } = await fixture();
  const input = { operationKey: "receipt-recovery", action: "APPROVE", name: "Ana", comment: "", confirmedManifestHash: revision.manifestHash! };
  const receipt = await decideArt(session.sessionToken, revision.id, input);
  const draft = await createArtRevision(actor, revision.packageId, { operationKey: "receipt-next", instructions: "Outra versão" });
  await db.artFile.create({ data: { revisionId: draft.id, name: "new.pdf", purpose: "FINAL", mimeType: "application/pdf", bytes: new Uint8Array([2]), sha256: "c".repeat(64), byteLength: 1 } });
  await publishRevision(actor, draft.id, draft.version, "publish-receipt-next");
  expect(await decideArt(session.sessionToken, revision.id, input)).toEqual(receipt);
  expect((await readArtReview(session.sessionToken, revision.id)).files).toEqual([]);
  await expect(readPublicArtFile(session.sessionToken, revision.id, revision.files[0].id)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("records one terminal decision under concurrent approval and adjustment requests", async () => {
  const { revision, session } = await fixture();
  const base = {
    name: "Ana",
    comment: "",
    confirmedManifestHash: revision.manifestHash!,
  };
  const results = await Promise.allSettled([
    decideArt(session.sessionToken, revision.id, {
      ...base,
      operationKey: "decision-one",
      action: "APPROVE",
    }),
    decideArt(session.sessionToken, revision.id, {
      ...base,
      operationKey: "decision-two",
      action: "REQUEST_CHANGES",
      comment: "Corrigir tamanho",
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.artDecision.count()).toBe(1);
  const decision = await db.artDecision.findFirstOrThrow();
  expect(decision.manifestHash).toBe(revision.manifestHash);
  const payload = {
    ...base,
    action: decision.action,
    operationKey: decision.operationKey,
    comment: decision.comment,
  };
  const receipt = await decideArt(session.sessionToken, revision.id, payload);
  expect(receipt.id).toBe(decision.id);
  await expect(
    decideArt(session.sessionToken, revision.id, {
      ...payload,
      name: "Outra pessoa",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("rejects an old tab after publishing another revision and requires the exact reviewed manifest", async () => {
  const { actor, revision, session } = await fixture();
  await expect(
    decideArt(session.sessionToken, revision.id, {
      operationKey: "wrong-manifest",
      action: "APPROVE",
      name: "Ana",
      comment: "",
      confirmedManifestHash: "c".repeat(64),
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const draft = await createArtRevision(actor, revision.packageId, {
    operationKey: "next-revision",
    instructions: "Nova arte",
  });
  await db.artFile.create({
    data: {
      revisionId: draft.id,
      name: "new.pdf",
      purpose: "FINAL",
      mimeType: "application/pdf",
      bytes: new Uint8Array([2]),
      sha256: "c".repeat(64),
      byteLength: 1,
    },
  });
  await publishRevision(actor, draft.id, draft.version, "publish-next");
  await expect(
    decideArt(session.sessionToken, revision.id, {
      operationKey: "old-decision",
      action: "APPROVE",
      name: "Ana",
      comment: "",
      confirmedManifestHash: revision.manifestHash!,
    }),
  ).rejects.toThrow();
});
