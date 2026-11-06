import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { hashPassword } from "../../src/server/auth/password";
import { assertPosDatabaseUrl } from "./database";
import { emptyPosDraft } from "../../src/domain/pos/types";
async function main() {
  assertPosDatabaseUrl(process.env.DATABASE_URL ?? "");
  const base = process.env.POS_APP_URL;
  assert.equal(base, "http://127.0.0.1:4179");
  async function request(
    path: string,
    cookie = "",
    body?: unknown,
    method = body === undefined ? "GET" : "POST",
    origin = base!,
  ) {
    return fetch(base + path, {
      method,
      headers: {
        Origin: origin,
        Cookie: cookie,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      redirect: "manual",
    });
  }
  async function data(
    path: string,
    cookie: string,
    body?: unknown,
    method?: string,
  ) {
    const response = await request(path, cookie, body, method);
    assert.equal(
      response.status,
      200,
      `${path}: ${await response.clone().text()}`,
    );
    return (await response.json()).data;
  }
  try {
    const password = "Sintetico-pdv-12345!";
    const actors = await Promise.all(
      (["OPERATOR", "ADMIN"] as const).map((role) =>
        db.user.create({
          data: {
            email: `${role.toLowerCase()}-${randomUUID()}@example.test`,
            name: `PDV HTTP ${role}`,
            role,
            passwordHash: "",
          },
        }),
      ),
    );
    const hash = await hashPassword(password);
    for (const actor of actors)
      await db.user.update({
        where: { id: actor.id },
        data: { passwordHash: hash },
      });
    const cookies: string[] = [];
    for (const actor of actors) {
      const response = await request("/api/auth/login", "", {
        email: actor.email,
        password,
      });
      assert.equal(response.status, 200);
      cookies.push(response.headers.getSetCookie()[0].split(";")[0]);
    }
    const [operatorCookie, adminCookie] = cookies;
    assert.equal((await request("/api/pos")).status, 401);
    assert.equal(
      (
        await request(
          "/api/pos",
          operatorCookie,
          {},
          "POST",
          "http://invalid.example.test",
        )
      ).status,
      403,
    );
    assert.equal(
      (await request("/api/finance/entries", operatorCookie)).status,
      403,
    );
    assert.equal(
      (await request("/api/finance/entries", adminCookie)).status,
      200,
    );
    const product = await db.product.create({
      data: {
        name: "Peça HTTP sintética",
        description: "Teste descartável",
        price: "2.50",
        calculation: {},
        availability: "AVAILABLE",
        paymentTerms: "Pix",
      },
    });
    const stock = await db.finishedStock.create({
      data: { productId: product.id, inventoriedAt: new Date() },
    });
    await db.finishedOrigin.create({
      data: {
        stockId: stock.id,
        kind: "OPENING",
        initialValue: "1.00",
        movements: {
          create: {
            kind: "OPENING",
            units: 2,
            actorId: actors[0].id,
            effectiveDate: new Date(),
          },
        },
      },
    });
    for (const cookie of cookies) {
      const start = await data("/api/pos", cookie, {});
      const input = {
        ...emptyPosDraft,
        method: "CARD",
        items: [
          {
            productId: product.id,
            quantity: 1,
            commercialRevision: product.commercialRevision,
            unitPrice: "2.50",
          },
        ],
      };
      const saved = await data(
        `/api/pos/${start.id}`,
        cookie,
        { expectedVersion: start.version, input },
        "PATCH",
      );
      const results = await Promise.all([
        data(`/api/pos/${start.id}/complete`, cookie, {
          expectedVersion: saved.version,
        }),
        data(`/api/pos/${start.id}/complete`, cookie, {
          expectedVersion: saved.version,
        }),
      ]);
      assert.equal(results[0].receipt.saleId, results[1].receipt.saleId);
      assert.equal(results[0].receipt.status, "ENTREGUE");
      const id = results[0].receipt.saleId;
      const sale = await data(`/api/sales/${id}`, cookie);
      assert.equal(sale.document.customerId, null);
      assert.equal(sale.posPayment.method, "CARD");
      const detail = await request(`/vendas/${id}`, cookie);
      assert.equal(detail.status, 200);
      assert.match(await detail.text(), /Pagamento informado no PDV/);
      assert.equal((await request("/atualizacoes", cookie)).status, 200);
      assert.equal(
        (
          await request(
            `/api/pos/${start.id}`,
            cookie === operatorCookie ? adminCookie : operatorCookie,
          )
        ).status,
        404,
      );
    }
    assert.equal(
      await db.cashMovement.count({
        where: { description: { contains: "Peça HTTP sintética" } },
      }),
      0,
    );
    console.log(
      "HTTP real no Next isolado: ADMIN/OPERATOR, login, CSRF, financeiro restrito, duplo envio, anonimato, detalhe/comprovante e Atualizações aprovados.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
