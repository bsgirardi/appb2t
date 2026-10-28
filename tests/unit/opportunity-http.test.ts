import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import { GET, POST } from "@/app/api/opportunities/route";
import { GET as detail } from "@/app/api/opportunities/[id]/route";
import { POST as command } from "@/app/api/opportunities/[id]/commands/route";
import { GET as events } from "@/app/api/opportunities/[id]/events/route";
import { GET as options } from "@/app/api/opportunities/options/route";
import { GET as candidates } from "@/app/api/opportunities/quote-candidates/route";
it("keeps every opportunity endpoint private before reading data", async () => {
  const r = new Request("http://localhost:3000/api/opportunities"),
    c = { params: Promise.resolve({ id: "private" }) };
  for (const response of [
    await GET(r),
    await POST(r),
    await detail(r, c),
    await command(r, c),
    await events(r, c),
    await options(),
    await candidates(r),
  ])
    expect(response.status).toBe(401);
});
