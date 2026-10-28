import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import { POST } from "@/app/api/consignment/commands/route";
import { GET as partners } from "@/app/api/consignment/partners/route";
import { GET as partner } from "@/app/api/consignment/partners/[id]/route";
import { GET as shipments } from "@/app/api/consignment/shipments/route";
import { GET as sales } from "@/app/api/consignment/sales/route";
import { GET as statements } from "@/app/api/consignment/statements/route";
import { GET as report } from "@/app/api/consignment/report/route";
import { GET as preview } from "@/app/api/consignment/statements/preview/route";
it("keeps every consignment entry point private before querying or parsing commands", async () => {
  const r = new Request("http://localhost:3000/api/consignment/partners");
  for (const response of [
    await POST(r),
    await partners(r),
    await partner(r, { params: Promise.resolve({ id: "private" }) }),
    await shipments(r),
    await sales(r),
    await statements(r),
    await report(r),
    await preview(r),
  ])
    expect(response.status).toBe(401);
});
