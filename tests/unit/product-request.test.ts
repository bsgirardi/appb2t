import { expect, it } from "vitest";
import { readProductRequest } from "@/lib/product-request";
const origin = "http://localhost:3000";
function request(data: FormData, source = origin) {
  process.env.APP_URL = origin;
  return new Request(origin, { method: "POST", headers: { origin: source }, body: data });
}
it("reads data without requiring replacement photo", async () => {
  const data = new FormData(); data.set("data", '{"name":"Peça"}');
  expect(await readProductRequest(request(data))).toEqual({ input: { name: "Peça" } });
});
it("rejects foreign origin, malformed JSON and unexpected fields", async () => {
  const data = new FormData(); data.set("data", "{}");
  await expect(readProductRequest(request(data, "https://evil.test"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  data.set("data", "invalid");
  await expect(readProductRequest(request(data))).rejects.toMatchObject({ code: "VALIDATION" });
  data.set("data", "{}"); data.set("extra", "value");
  await expect(readProductRequest(request(data))).rejects.toMatchObject({ code: "VALIDATION" });
});
it("limits bytes even without Content-Length", async () => {
  const data = new FormData(); data.set("data", "{}"); data.set("photo", new Blob([new Uint8Array(6 * 1024 * 1024)]), "large.png");
  await expect(readProductRequest(request(data))).rejects.toMatchObject({ code: "VALIDATION" });
});
