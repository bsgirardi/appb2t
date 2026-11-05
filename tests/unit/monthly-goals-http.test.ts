import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/server/auth/guards", () => ({ requireActor: mocks.actor }));
vi.mock("@/server/profitability/monthly-goals", () => ({
  readMonthlyGoal: mocks.read,
  saveMonthlyGoal: mocks.save,
}));
import { GET, POST } from "@/app/api/profitability/goals/route";
import { AppError } from "@/lib/errors";
beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "http://localhost:3000";
  mocks.actor.mockResolvedValue({ id: "admin", role: "ADMIN" });
  mocks.read.mockResolvedValue({ version: 1 });
  mocks.save.mockResolvedValue({ version: 2 });
});
const send = (origin = "http://localhost:3000", body = "{}") =>
  POST(
    new Request("http://localhost:3000/api/profitability/goals", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
    }),
  );
it("returns private no-store data and validates mutation origin", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/profitability/goals?month=2026-11"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.read).toHaveBeenCalledWith(
    { id: "admin", role: "ADMIN" },
    { month: "2026-11" },
  );
  expect((await send("https://outside.test")).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
  expect((await send(undefined, "{broken")).status).toBe(422);
  expect((await send()).status).toBe(200);
});
it("preserves unauthenticated, forbidden and conflict statuses", async () => {
  mocks.actor.mockRejectedValueOnce(new AppError("UNAUTHENTICATED", "Entre"));
  expect((await send()).status).toBe(401);
  mocks.save.mockRejectedValueOnce(new AppError("FORBIDDEN", "Sem acesso"));
  expect((await send()).status).toBe(403);
  mocks.save.mockRejectedValueOnce(new AppError("CONFLICT", "Atualize"));
  expect((await send()).status).toBe(409);
});
