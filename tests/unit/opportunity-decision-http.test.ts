import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), getQuote: vi.fn() }));
vi.mock("@/server/auth/guards", () => ({ requireActor: mocks.actor }));
vi.mock("@/server/quotes", () => ({
  getQuote: mocks.getQuote,
  saveQuote: vi.fn(),
}));
import { GET } from "@/app/api/quotes/[id]/route";
import { AppError } from "@/lib/errors";
it("rejects unauthenticated reads before accessing quote costs", async () => {
  mocks.actor.mockRejectedValue(new AppError("UNAUTHENTICATED", "Entre"));
  const response = await GET(new Request("http://localhost/api/quotes/q"), {
    params: Promise.resolve({ id: "q" }),
  });
  expect(response.status).toBe(401);
  expect(mocks.getQuote).not.toHaveBeenCalled();
});
it.each(["ADMIN", "OPERATOR"])(
  "uses the existing private read for %s",
  async (role) => {
    const actor = { id: "a", role };
    mocks.actor.mockResolvedValue(actor);
    mocks.getQuote.mockResolvedValue({ id: "q", version: 1 });
    const response = await GET(new Request("http://localhost/api/quotes/q"), {
      params: Promise.resolve({ id: "q" }),
    });
    expect(response.status).toBe(200);
    expect(mocks.getQuote).toHaveBeenCalledWith(actor, "q");
  },
);
