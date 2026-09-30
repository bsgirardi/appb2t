import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import { GET, POST } from "@/app/api/quotes/route";
import { GET as detail, PUT } from "@/app/api/quotes/[id]/route";
import { POST as transition } from "@/app/api/quotes/[id]/transition/route";
import { GET as logo } from "@/app/api/quotes/[id]/logo/route";
it("keeps quotes and archived logos private", async () => {
  const request = new Request("http://localhost:3000/api/quotes"),
    context = { params: Promise.resolve({ id: "private" }) };
  for (const response of [
    await GET(request),
    await POST(request),
    await detail(request, context),
    await PUT(request, context),
    await transition(request, context),
    await logo(request, context),
  ])
    expect(response.status).toBe(401);
});
