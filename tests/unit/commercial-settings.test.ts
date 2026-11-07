import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    commercialSettings: m,
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({ commercialSettings: m }),
  },
}));
import {
  getCommercialSettings,
  saveCommercialSettings,
} from "@/server/commercial-settings";
const actor = {
  id: "admin",
  name: "Admin",
  email: "admin@test.invalid",
  role: "ADMIN" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.findUnique.mockResolvedValue(null);
});
it("reads fourteen without creating a row", async () => {
  expect(await getCommercialSettings()).toEqual({
    replyWaitDays: 14,
    version: 0,
  });
  expect(m.create).not.toHaveBeenCalled();
});
it("rejects operators before writes and validates whole day limits", async () => {
  await expect(
    saveCommercialSettings(
      { ...actor, role: "OPERATOR" },
      { replyWaitDays: 3, expectedVersion: 0 },
    ),
  ).rejects.toThrow(/administradores/);
  await expect(
    saveCommercialSettings(actor, { replyWaitDays: 0, expectedVersion: 0 }),
  ).rejects.toThrow();
  expect(m.create).not.toHaveBeenCalled();
});
it("creates versioned preferences, rejects concurrent edits", async () => {
  m.create.mockResolvedValue({ replyWaitDays: 21, version: 1 });
  expect(
    await saveCommercialSettings(actor, {
      replyWaitDays: 21,
      expectedVersion: 0,
    }),
  ).toEqual({ replyWaitDays: 21, version: 1 });
  m.updateMany.mockResolvedValue({ count: 0 });
  await expect(
    saveCommercialSettings(actor, { replyWaitDays: 7, expectedVersion: 1 }),
  ).rejects.toThrow();
  expect(m.updateMany).toHaveBeenCalledWith({
    where: { id: 1, version: 1 },
    data: { replyWaitDays: 7, updatedById: "admin", version: { increment: 1 } },
  });
});
