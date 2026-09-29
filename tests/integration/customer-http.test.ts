import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import { GET, POST } from "@/app/api/customers/route";
import { GET as detail, PUT, PATCH } from "@/app/api/customers/[id]/route";
it("denies anonymous access to every customer endpoint", async () => {
  const request = new Request("http://localhost:3000/api/customers");
  const context = { params: Promise.resolve({ id: "private-customer" }) };
  for (const response of [
    await GET(request),
    await POST(request),
    await detail(request, context),
    await PUT(request, context),
    await PATCH(request, context),
  ])
    expect(response.status).toBe(401);
});
