// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from "vitest";
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.restoreAllMocks();
});
it("migrates v1 once and never overwrites an empty v2", async () => {
  localStorage.setItem(
    "b2t:inquiry:v1",
    JSON.stringify([{ productId: "p", quantity: 2 }]),
  );
  const s = await import("@/lib/inquiry-store");
  expect(s.readInquiry()[0].quantity).toBe(2);
  s.writeInquiry([]);
  expect(s.readInquiry()).toEqual([]);
  expect(localStorage.getItem("b2t:inquiry:v1")).not.toBeNull();
});
it("preserves corrupted saved data until explicit reset", async () => {
  localStorage.setItem("b2t:inquiry:v2", "{broken");
  const s = await import("@/lib/inquiry-store");
  expect(() => s.writeInquiry([])).toThrow();
  expect(localStorage.getItem("b2t:inquiry:v2")).toBe("{broken");
  s.resetInquiry();
  expect(s.readInquiry()).toEqual([]);
});
it("retains the latest draft in memory if an existing storage write fails", async () => {
  const s = await import("@/lib/inquiry-store");
  s.writeInquiry([{ productId: "p", quantity: 1 }]);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  s.writeInquiry([{ productId: "p", quantity: 2 }]);
  expect(s.readInquiry()[0].quantity).toBe(2);
});
it("does not silently discard corrupt legacy data", async () => {
  localStorage.setItem("b2t:inquiry:v1", "broken");
  const s = await import("@/lib/inquiry-store");
  expect(() => s.writeInquiry([])).toThrow();
  expect(localStorage.getItem("b2t:inquiry:v1")).toBe("broken");
});
