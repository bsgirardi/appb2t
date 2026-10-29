import { expect, it } from "vitest";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";
import {
  buildAdPackage,
  assertAdImageBudget,
  assertAdJpegSize,
} from "@/server/advertising/export-package";
it("exports ordered JPEG copies, factual Unicode text and a permitted manifest", async () => {
  const bytes = await sharp({
    create: {
      width: 40,
      height: 20,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .webp()
    .toBuffer();
  const capture = {
    draftId: "d1",
    draftVersion: 2,
    channel: "INSTAGRAM" as const,
    title: "Peça à mão",
    body: "Texto 🧡",
    product: { id: "p1", name: "Peça", sku: "P1" },
    generatedAt: "2026-10-29T12:00:00.000Z",
    photos: [
      { id: "photo-2", position: 0, bytes },
      { id: "photo-1", position: 1, bytes },
    ],
  };
  const zip = unzipSync(await buildAdPackage(capture));
  expect(Object.keys(zip)).toEqual([
    "texto.txt",
    "referencia.json",
    "fotos/01.jpg",
    "fotos/02.jpg",
  ]);
  expect(strFromU8(zip["texto.txt"])).toBe("Peça à mão\n\nTexto 🧡");
  const meta = await sharp(zip["fotos/01.jpg"]).metadata();
  expect(meta.format).toBe("jpeg");
  expect(meta.width).toBe(40);
  expect(meta.height).toBe(20);
  const pixel = await sharp(zip["fotos/01.jpg"]).raw().toBuffer();
  expect(pixel[0]).toBeGreaterThan(245);
  expect(JSON.parse(strFromU8(zip["referencia.json"]))).toMatchObject({
    draftVersion: 2,
    channel: "INSTAGRAM",
    product: { id: "p1" },
  });
  await expect(
    buildAdPackage({
      ...capture,
      photos: [{ id: "i", position: 0, bytes: Buffer.from([1, 2]) }],
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("enforces aggregate input and individual output boundaries without partial packages", () => {
  expect(() => assertAdImageBudget([30 * 1024 * 1024])).not.toThrow();
  expect(() => assertAdImageBudget([30 * 1024 * 1024 + 1])).toThrow();
  expect(() => assertAdImageBudget([])).toThrow();
  expect(() => assertAdImageBudget(Array(11).fill(1))).toThrow();
  expect(() => assertAdJpegSize(5 * 1024 * 1024)).not.toThrow();
  expect(() => assertAdJpegSize(5 * 1024 * 1024 + 1)).toThrow();
});
