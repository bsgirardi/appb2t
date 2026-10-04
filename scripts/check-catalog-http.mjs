// Run against the isolated, running validation app; no writes are performed.
import assert from "node:assert/strict";
const base = new URL(process.env.CATALOG_CHECK_URL || "http://localhost:3100");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
  throw new Error("Use a local validation server.");
}
async function read(path) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  return { response, body: await response.text() };
}
function robots(body) {
  return body.match(/<meta name="robots" content="([^"]+)"/)?.[1];
}
const catalog = await read("/");
assert.equal(catalog.response.status, 200);
assert.match(catalog.body, /rel="canonical" href="[^"]+\/"/);
for (const old of ["/portfolio", "/catalogo"]) {
  const redirect = await read(old + "?busca=vaso&ordem=menor-preco");
  assert.equal(redirect.response.status, 308);
  const target = new URL(redirect.response.headers.get("location"), base);
  assert.equal(target.pathname, "/");
  assert.equal(target.searchParams.get("busca"), "vaso");
  assert.equal(target.searchParams.get("ordem"), "menor-preco");
}
const privatePage = await read("/calculadora");
assert.ok([307, 308].includes(privatePage.response.status));
assert.equal(
  new URL(privatePage.response.headers.get("location"), base).pathname,
  "/login",
);
assert.equal(robots(catalog.body), "index, follow");
for (const path of ["/?busca=teste", "/?ordem=menor-preco"]) {
  const page = await read(path);
  assert.equal(page.response.status, 200);
  assert.equal(robots(page.body), "noindex, follow");
}
assert.equal(robots((await read("/login")).body), "noindex, nofollow");
assert.equal(
  robots((await read("/portfolio/orcamento")).body),
  "noindex, follow",
);
assert.equal((await read("/api/products")).response.status, 401);
assert.equal(
  (await read("/portfolio/produto/inexistente/produto")).response.status,
  404,
);
assert.equal((await read("/?colecao=inexistente")).response.status, 404);
const sitemap = await read("/sitemap.xml");
assert.equal(sitemap.response.status, 200);
const appearance = JSON.parse((await read("/api/appearance")).body).data;
for (const [path, enabled] of [
  ["/portfolio/sobre", Boolean(appearance.storefront?.aboutText)],
  ["/portfolio/ajuda", Boolean(appearance.storefront?.faq?.length)],
]) {
  const page = await read(path);
  assert.equal(page.response.status, enabled ? 200 : 404);
  assert.equal(sitemap.body.includes(path), enabled);
  if (enabled) assert.equal(robots(page.body), "index, follow");
}
const productUrl = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  .find((url) => new URL(url).pathname.startsWith("/portfolio/produto/"));
assert.ok(
  productUrl,
  "Publish a test product to validate its page and redirects.",
);
const path = new URL(productUrl).pathname;
const product = await read(path);
assert.equal(product.response.status, 200);
assert.equal(robots(product.body), "index, follow");
assert.match(product.body, /application\/ld\+json/);
const oldPath = path.slice(0, path.lastIndexOf("/")) + "/nome-antigo-validacao";
const redirect = await read(oldPath);
assert.equal(redirect.response.status, 308);
assert.equal(
  new URL(redirect.response.headers.get("location"), base).pathname,
  path,
);
console.log(
  "HTTP catalog checks passed: indexation, privacy, sitemap, product, 404 and 308.",
);
