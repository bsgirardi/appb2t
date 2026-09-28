import { afterEach, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  state: vi.fn(),
  image: vi.fn(),
  session: vi.fn(),
  cookies: vi.fn(),
}));
vi.mock("@/server/auth/guards", () => ({ requireActor: mocks.actor }));
vi.mock("@/server/products", () => ({
  listProducts: mocks.list,
  createProduct: mocks.create,
  getProduct: mocks.get,
  updateProduct: mocks.update,
  setProductActive: mocks.state,
  getProductImage: mocks.image,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/server/auth/session", () => ({
  getSession: mocks.session,
  SESSION_COOKIE: "b2t_session",
}));
import { GET, POST } from "@/app/api/products/route";
import { GET as get, PUT, PATCH } from "@/app/api/products/[id]/route";
import { GET as photo } from "@/app/api/products/[id]/image/route";
const context = { params: Promise.resolve({ id: "product" }) };
afterEach(() => vi.resetAllMocks());
it("rejects every private entry point before reading or writing data", async () => {
  mocks.actor.mockRejectedValue(new AppError("UNAUTHENTICATED", "Entre"));
  const request = new Request("http://localhost:3000/api/products", {
    method: "POST",
  });
  for (const response of [
    await GET(),
    await POST(request),
    await get(request, context),
    await PUT(request, context),
    await PATCH(request, context),
  ])
    expect(response.status).toBe(401);
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each(["ADMIN", "OPERATOR"])(
  "allows %s but rejects foreign origins",
  async (role) => {
    process.env.APP_URL = "http://localhost:3000";
    mocks.actor.mockResolvedValue({ id: "actor", role });
    mocks.list.mockResolvedValue([]);
    expect((await GET()).status).toBe(200);
    const request = new Request("http://localhost:3000", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    });
    expect((await POST(request)).status).toBe(403);
  },
);
it("serves authorized images without cache and passes anonymous identity to visibility checks", async () => {
  mocks.cookies.mockResolvedValue({ get: () => undefined });
  mocks.image.mockResolvedValue({
    bytes: new Uint8Array([1]),
    mimeType: "image/webp",
  });
  const r = await photo(new Request("http://localhost:3000"), context);
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  expect(mocks.image).toHaveBeenCalledWith("product", null);
  mocks.image.mockRejectedValue(
    new AppError("NOT_FOUND", "Produto não encontrado"),
  );
  expect(
    (await photo(new Request("http://localhost:3000"), context)).status,
  ).toBe(404);
});
