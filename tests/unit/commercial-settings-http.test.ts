import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ guard: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock("@/server/auth/guards", () => ({ requireAdmin: m.guard }));
vi.mock("@/server/commercial-settings", () => ({
  getCommercialSettings: m.read,
  saveCommercialSettings: m.save,
}));
import { GET, POST } from "@/app/api/commercial-settings/route";
import { AppError } from "@/lib/errors";
beforeEach(() => vi.clearAllMocks());
it.each(["UNAUTHENTICATED", "FORBIDDEN"] as const)(
  "rejects %s before reading or writing config",
  async (code) => {
    m.guard.mockRejectedValue(new AppError(code, "Acesso negado"));
    expect((await GET()).status).toBe(code === "FORBIDDEN" ? 403 : 401);
    expect(
      (
        await POST(
          new Request("http://test/api/commercial-settings", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(code === "FORBIDDEN" ? 403 : 401);
    expect(m.read).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  },
);
