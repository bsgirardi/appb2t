import { it, expect } from "vitest";
import { jsonBody, endpoint } from "@/lib/http";
import { printerValuesSchema } from "@/domain/calculation/validation";
it("returns Portuguese field errors for invalid printer limits", async () => {
  const response = await endpoint(async () => {
    printerValuesSchema.parse({
      acquisitionCost: "1",
      amortizationMonths: 12,
      daysPerMonth: 32,
      hoursPerDay: "8",
      watts: "100",
    });
    return Response.json({});
  });
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.error.fields.daysPerMonth).not.toMatch(/Too big|expected|number/);
  expect(body.error.fields.daysPerMonth).toContain("31");
});
it("rejects cross-origin and oversized mutations", async () => {
  await expect(
    jsonBody(
      new Request("http://localhost:3000/api/settings", {
        method: "POST",
        headers: {
          origin: "https://foreign.test",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    jsonBody(
      new Request("http://localhost:3000/api/settings", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: " ".repeat(17000),
      }),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("returns sanitized internal error without secrets", async () => {
  const response = await endpoint(async () => {
    throw new Error("postgres://secret-password");
  });
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain(
    "secret-password",
  );
});
