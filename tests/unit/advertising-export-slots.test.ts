import { expect, it } from "vitest";
import { withAdExportSlot } from "@/server/advertising/export-slots";
it("admits two jobs, rejects the third and releases slots after errors", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const a = withAdExportSlot(() => gate),
    b = withAdExportSlot(() => gate);
  await expect(withAdExportSlot(async () => 1)).rejects.toMatchObject({
    code: "RATE_LIMIT",
  });
  release();
  await Promise.all([a, b]);
  await expect(
    withAdExportSlot(async () => {
      throw Error("failure");
    }),
  ).rejects.toThrow("failure");
  expect(await withAdExportSlot(async () => 42)).toBe(42);
});
