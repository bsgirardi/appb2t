import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PDFDocument, PDFName } from "@cantoo/pdf-lib";
import { validateArtFile } from "@/server/art/files";

async function pdf() {
  const doc = await PDFDocument.create();
  doc.addPage();
  return doc;
}
it("preserves original image bytes and separately prepares a bounded WebP preview", async () => {
  const bytes = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const file = await validateArtFile(bytes, "../../foto.png");
  expect(file.bytes).toEqual(new Uint8Array(bytes));
  expect(file.name).toBe("foto.png");
  expect(file.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
  expect((await sharp(file.preview!).metadata()).format).toBe("webp");
  expect(file.previewSha256).not.toBe(file.sha256);
});
it("rejects empty, oversized or disguised content regardless of extension", async () => {
  for (const bytes of [
    new Uint8Array(),
    new Uint8Array(10 * 1024 * 1024 + 1),
    new TextEncoder().encode("<svg></svg>"),
  ])
    await expect(validateArtFile(bytes, "image.png")).rejects.toMatchObject({
      code: "VALIDATION",
    });
});
it("accepts a structurally valid passive PDF and rejects truncated and encrypted documents", async () => {
  const doc = await pdf();
  const bytes = await doc.save();
  const file = await validateArtFile(bytes, 'arte\r\n".pdf');
  expect(file.mimeType).toBe("application/pdf");
  expect(file.preview).toBeNull();
  expect(file.name).not.toMatch(/[\r\n"]/);
  await expect(
    validateArtFile(bytes.slice(0, 80), "bad.pdf"),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  doc.encrypt({
    userPassword: "secret",
    ownerPassword: "owner",
    algorithm: "AES-128",
  });
  await expect(
    validateArtFile(await doc.save(), "encrypted.pdf"),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("rejects JavaScript and indirect active dictionaries inside compressed object streams", async () => {
  const script = await pdf();
  script.addJavaScript("run", "app.alert('no')");
  await expect(
    validateArtFile(
      await script.save({ useObjectStreams: true }),
      "active.pdf",
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  for (const key of ["OpenAction", "AA", "EmbeddedFiles", "XFA", "RichMedia"]) {
    const doc = await pdf();
    const action = doc.context.register(
      doc.context.obj({ S: "Launch", F: "program.exe" }),
    );
    doc.catalog.set(PDFName.of(key), action);
    await expect(
      validateArtFile(await doc.save({ useObjectStreams: true }), "active.pdf"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  }
});
