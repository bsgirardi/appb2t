import { expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { saveCustomer } from "@/server/customers";
import { todaySaoPaulo } from "@/domain/commerce/dates";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { GET, POST } from "@/app/api/sales/route";
import { POST as confirm } from "@/app/api/sales/[id]/confirm/route";
import { POST as transition } from "@/app/api/sales/[id]/transition/route";
import { PUT as appearance } from "@/app/api/appearance/route";
setupDatabase();
const request = (data: unknown) =>
  new Request("http://localhost:3000/api/sales", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });
it("allows an operator to manage the full sales workflow without admin configuration access", async () => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
  expect((await GET(request({}))).status).toBe(401);
  expect((await POST(request({}))).status).toBe(401);
  const actor = await seedUser("OPERATOR");
  session.token = "b".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const c = await saveCustomer(actor, undefined, {
    name: "Cliente HTTP",
    type: "PERSON",
    active: true,
  });
  const created = await POST(
    request({
      customerId: c.id,
      items: [{ description: "Peça", quantity: 1, unitPrice: "10.00" }],
      discount: "0.00",
      shipping: "0.00",
      paymentTerms: "Pix",
      internalNotes: "",
    }),
  );
  expect(created.status).toBe(200);
  let sale = (await created.json()).data;
  const ctx = { params: Promise.resolve({ id: sale.id }) };
  expect(
    (await transition(request({ expectedVersion: 1, status: "ENTREGUE" }), ctx))
      .status,
  ).toBe(422);
  const confirmed = await confirm(
    request({
      expectedVersion: 1,
      installments: [
        { number: 1, amount: "10.00", dueDate: todaySaoPaulo(new Date()) },
      ],
      operationKey: "http-confirm-key",
    }),
    ctx,
  );
  expect(confirmed.status).toBe(200);
  sale = (await confirmed.json()).data;
  expect(sale.receiptSummary.received).toBe("0.00");
  expect(sale.fulfillmentMode).toBe("U3");
  expect(
    (
      await transition(
        request({ expectedVersion: sale.version, status: "EM_PRODUCAO" }),
        ctx,
      )
    ).status,
  ).toBe(422);
  // Retain coverage of the manual operational workflow for historical sales.
  await db.sale.update({
    where: { id: sale.id },
    data: { fulfillmentMode: "LEGACY" },
  });
  for (const status of ["EM_PRODUCAO", "PRONTA", "ENTREGUE"]) {
    const response = await transition(
      request({ expectedVersion: sale.version, status }),
      ctx,
    );
    expect(response.status).toBe(200);
    sale = (await response.json()).data;
    expect(sale.status).toBe(status);
  }
  expect(
    (
      await transition(
        request({
          expectedVersion: sale.version,
          status: "CANCELADA",
          reason: "Desistência",
        }),
        ctx,
      )
    ).status,
  ).toBe(422);
  expect((await appearance(request({}))).status).toBe(403);
});
