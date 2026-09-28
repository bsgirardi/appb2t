import { it, expect } from "vitest";
import { health } from "@/server/health";
it("returns unavailable without leaking connection information", async () => {
  const result = await health(async () => {
    throw new Error("secret database url");
  });
  expect(result).toEqual({ status: 503, body: { status: "unavailable" } });
});
it("reports success after database query", async () => {
  expect(await health(async () => 1)).toEqual({
    status: 200,
    body: { status: "ok" },
  });
});
