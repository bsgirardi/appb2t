import { expect, it } from "vitest";
import sharp from "sharp";
import { normalizeProductImage } from "@/server/product-images";
it.each(["jpeg", "png", "webp"] as const)(
  "normalizes %s to bounded webp",
  async (format) => {
    const bytes = await sharp({
      create: { width: 1700, height: 20, channels: 3, background: "red" },
    })
      .toFormat(format)
      .toBuffer();
    const result = await normalizeProductImage(bytes);
    const meta = await sharp(result.bytes).metadata();
    expect(result.mimeType).toBe("image/webp");
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1600);
  },
);
it("rejects corrupt, SVG, oversized files and excessive pixel counts", async () => {
  for (const bytes of [
    Buffer.from("not an image"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    ),
    Buffer.alloc(5 * 1024 * 1024 + 1),
  ]) {
    await expect(normalizeProductImage(bytes)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  }
  const huge = await sharp({
    create: { width: 6500, height: 6500, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(normalizeProductImage(huge)).rejects.toMatchObject({
    code: "VALIDATION",
  });
});
