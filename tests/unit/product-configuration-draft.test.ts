// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  readConfigurationDraft,
  writeConfigurationDraft,
  clearConfigurationDraft,
} from "@/lib/product-configuration-draft";
afterEach(() => vi.restoreAllMocks());
it("keeps the latest session draft when quota blocks replacing an old value", () => {
  const id = "quota-case";
  writeConfigurationDraft(id, { productId: "p", quantity: 1 });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("quota");
  });
  expect(
    writeConfigurationDraft(id, { productId: "p", quantity: 2 }),
  ).toContain("memória");
  expect(readConfigurationDraft(id)?.quantity).toBe(2);
  clearConfigurationDraft(id);
});
