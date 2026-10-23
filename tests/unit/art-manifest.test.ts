import { expect, it } from "vitest";
import { buildArtManifest } from "@/domain/art/manifest";

const line = { sourceLineId: "ana", configurationHash: "a".repeat(64) };
const final = {
  id: "final",
  purpose: "FINAL" as const,
  sha256: "b".repeat(64),
  previewSha256: null,
};

it("binds approval to original bytes, preview, instructions and exact line identity", () => {
  const input = { instructions: "Nome Ana", lines: [line], files: [final] };
  const original = buildArtManifest(input);
  expect(original.manifest).toEqual({
    schemaVersion: 1,
    instructions: "Nome Ana",
    lines: [line],
    files: [final],
  });
  for (const changed of [
    { ...input, instructions: "Nome Bia" },
    { ...input, lines: [{ ...line, sourceLineId: "bia" }] },
    { ...input, lines: [{ ...line, configurationHash: "c".repeat(64) }] },
    { ...input, files: [{ ...final, sha256: "c".repeat(64) }] },
    { ...input, files: [{ ...final, previewSha256: "c".repeat(64) }] },
  ])
    expect(buildArtManifest(changed).hash).not.toBe(original.hash);
});

it("canonicalizes order but never treats a reference as an approved final", () => {
  const other = { ...line, sourceLineId: "bia" };
  const reference = {
    ...final,
    id: "reference",
    purpose: "REFERENCE" as const,
  };
  const a = buildArtManifest({
    instructions: "",
    lines: [line, other],
    files: [reference, final],
  });
  const b = buildArtManifest({
    instructions: "",
    lines: [other, line],
    files: [final],
  });
  expect(a).toEqual(b);
  expect(() =>
    buildArtManifest({ instructions: "", lines: [line], files: [reference] }),
  ).toThrow();
});

it("rejects duplicate line and file identities before publishing ambiguous evidence", () => {
  expect(() =>
    buildArtManifest({ instructions: "", lines: [line, line], files: [final] }),
  ).toThrow();
  expect(() =>
    buildArtManifest({
      instructions: "",
      lines: [line],
      files: [final, final],
    }),
  ).toThrow();
});
