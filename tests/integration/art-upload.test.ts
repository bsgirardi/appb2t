import { expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createCatalogRequestFixture } from "../fixtures/catalog-request-db";
import { createArtPackage, publishRevision } from "@/server/art/revisions";
import { uploadArtFile, deleteDraftFile } from "@/server/art/files";

setupDatabase();
async function fixture() {
  const { actor, request, lines } = await createCatalogRequestFixture();
  const revision = await createArtPackage(actor, request.id, {
    operationKey: "create-package",
    sourceLineIds: [lines[0].lineId],
    instructions: "",
  });
  const bytes = new Uint8Array(
    await sharp({
      create: { width: 2, height: 2, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer(),
  );
  return { actor, revision, file: { bytes, name: "arte.png" } };
}
it("recovers uploaded original after a lost response without consuming quota twice", async () => {
  const { actor, revision, file } = await fixture();
  const args = [
    actor,
    revision.id,
    revision.version,
    "upload-once",
    file,
    "FINAL",
  ] as const;
  const saved = await uploadArtFile(...args);
  expect(saved.version).toBe(2);
  expect(saved.files).toHaveLength(1);
  expect(await uploadArtFile(...args)).toEqual(saved);
  expect(await db.artFile.count()).toBe(1);
  const original = await db.artFile.findFirstOrThrow();
  expect(original.bytes).toEqual(file.bytes);
  await expect(
    uploadArtFile(
      actor,
      revision.id,
      revision.version,
      "upload-once",
      { ...file, bytes: new Uint8Array([1]) },
      "FINAL",
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await publishRevision(actor, revision.id, saved.version, "publish-final");
  await expect(
    deleteDraftFile(
      actor,
      saved.files[0].id,
      saved.version + 1,
      "remove-final",
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("rejects the eleventh file and allows explicit removal only while draft", async () => {
  const { actor, revision, file } = await fixture();
  let saved = revision;
  for (let n = 0; n < 10; n++)
    saved = await uploadArtFile(
      actor,
      revision.id,
      saved.version,
      `upload-file-${n}`,
      file,
      "FINAL",
    );
  await expect(
    uploadArtFile(
      actor,
      revision.id,
      saved.version,
      "upload-extra",
      file,
      "FINAL",
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const removed = await deleteDraftFile(
    actor,
    saved.files[0].id,
    saved.version,
    "remove-draft",
  );
  expect(removed.files).toHaveLength(9);
});
