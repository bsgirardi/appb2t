import assert from "node:assert/strict";
import { assertTaxDatabase } from "./database";
async function main() {
  assertTaxDatabase();
  const origin = "http://127.0.0.1:3037";
  if (process.env.APP_URL !== origin)
    throw Error("Prévia HTTP sintética exclusiva não confirmada.");
  const login = async (email: string) => {
    const r = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "Tax-preview-2026!" }),
    });
    assert.equal(r.status, 200);
    return r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  };
  assert.equal((await fetch(`${origin}/api/tax/profiles`)).status, 401);
  const admin = await login("tax-admin@example.test"),
    operator = await login("tax-operator@example.test");
  for (const path of [
    "/api/tax/profiles",
    "/api/tax/reports?competence=2026-11",
    "/api/tax/memories/unknown",
  ]) {
    assert.equal(
      (await fetch(origin + path, { headers: { cookie: operator } })).status,
      403,
    );
  }
  const profile = await fetch(`${origin}/api/tax/profiles`, {
    headers: { cookie: admin },
  });
  assert.equal(profile.status, 200);
  const catalog = await fetch(`${origin}/api/pricing/catalog`, {
    headers: { cookie: operator },
  });
  assert.equal(catalog.status, 200);
  const body = await catalog.json();
  assert.equal(JSON.stringify(body.data.tax).includes("monthlyDas"), false);
  assert.equal(JSON.stringify(body.data.tax).includes("source"), false);
  assert.equal(
    (
      await fetch(`${origin}/api/tax/reports?competence=2026-13`, {
        headers: { cookie: admin },
      })
    ).status,
    422,
  );
  const blocked = await fetch(`${origin}/api/tax/profiles`, {
    method: "POST",
    headers: {
      cookie: admin,
      origin: "http://untrusted.invalid",
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.equal(blocked.status, 403);
  console.log(
    "HTTP real sintético aprovado: autenticação, ADMIN/OPERATOR, catálogo mínimo, competência inválida e proteção de origem.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
