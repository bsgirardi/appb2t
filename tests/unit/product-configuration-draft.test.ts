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
it("preserves unfinished text while quantity is empty, decimal or out of range", () => {
  for (const quantity of [NaN, 0, 1.5, 100]) {
    const id = `unfinished-${String(quantity)}`;
    writeConfigurationDraft(id, {
      productId: "p",
      quantity: 1,
      answers: [{ fieldId: "name", value: "Ana" }],
    });
    writeConfigurationDraft(id, {
      productId: "p",
      quantity,
      answers: [{ fieldId: "name", value: "Bia" }],
    });
    expect(readConfigurationDraft(id)?.answers).toEqual([
      { fieldId: "name", value: "Bia" },
    ]);
    if (Number.isNaN(quantity))
      expect(Number.isNaN(readConfigurationDraft(id)?.quantity)).toBe(true);
    else expect(readConfigurationDraft(id)?.quantity).toBe(quantity);
    clearConfigurationDraft(id);
  }
});
