import { expect, it } from "vitest";
import sharp from "sharp";
import { contrastRatio, readableText } from "@/domain/appearance/colors";
import {
  appearanceSchema,
  defaultAppearance,
} from "@/domain/appearance/validation";
import { normalizeImage } from "@/server/product-images";
it("selects contrasting text for extreme brand colors and rejects CSS", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  for (const bg of ["#ffffff", "#000000", "#ffff00", "#224455"])
    expect(contrastRatio(bg, readableText(bg))).toBeGreaterThanOrEqual(4.5);
  expect(() =>
    appearanceSchema.parse({
      ...defaultAppearance,
      expectedVersion: 0,
      lightPrimary: "red;display:none",
    }),
  ).toThrow();
});
it("preserves alpha while resizing logos and rejects excess bytes", async () => {
  const png = await sharp({
    create: {
      width: 1100,
      height: 1100,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.3 },
    },
  })
    .png()
    .toBuffer();
  const logo = await normalizeImage(png, {
    maxBytes: 2 * 1024 * 1024,
    maxPixels: 16_000_000,
    maxDimension: 1024,
  });
  const meta = await sharp(logo.bytes).metadata();
  expect(meta.width).toBe(1024);
  expect(meta.hasAlpha).toBe(true);
  await expect(
    normalizeImage(new Uint8Array(2 * 1024 * 1024 + 1), {
      maxBytes: 2 * 1024 * 1024,
      maxPixels: 16_000_000,
      maxDimension: 1024,
    }),
  ).rejects.toThrow();
});

it("defaults the initial banner to visible for older saved settings", () => {
  const oldSettings = { ...defaultAppearance.storefront, showHero: undefined };
  const parsed = appearanceSchema.parse({
    ...defaultAppearance,
    storefront: oldSettings,
    expectedVersion: 0,
  });
  expect(parsed.storefront?.showHero).toBe(true);
});
