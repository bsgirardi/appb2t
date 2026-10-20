/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser acceptance runner. */
// Executes only against the isolated C1 candidate. Never opens contact links.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.argv[2];
if (base !== "http://localhost:3104" && base !== "http://127.0.0.1:3104")
  throw new Error("Only the disposable C1 candidate on port 3104 is allowed");
const output = path.resolve("test-results/catalog-c1");
async function main() {
  const fixture = JSON.parse(
    await fs.readFile(path.join(output, "fixture.json"), "utf8"),
  );
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const errors = [];
  const products = fixture.products;
  try {
    for (const width of [320, 390, 1440])
      for (const colorScheme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          colorScheme,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(String(error)));
        const cases = [
          ["home", "/"],
          ["results", "/?busca=Demonstra%C3%A7%C3%A3o&ordem=menor-preco"],
          ["configured", products[0].path],
          ["consult", products[1].path],
          ["unavailable", products[2].path],
          ["empty-list", "/portfolio/orcamento"],
        ];
        for (const [name, route] of cases) {
          const response = await page.goto(base + route, {
            waitUntil: "networkidle",
          });
          assert.equal(response.status(), 200);
          await page.locator(".storefront").waitFor();
          await page.evaluate(() => document.fonts.ready);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            `${name}: overflow at ${width}`,
          );
          const small = await page
            .locator('.storefront [data-slot="button"]')
            .evaluateAll((nodes) =>
              nodes
                .filter((n) => n.getBoundingClientRect().height < 43.9)
                .map((n) => n.textContent),
            );
          assert.deepEqual(small, [], `${name}: small public actions`);
          const imageState = await page
            .locator(".storefront img")
            .evaluateAll((nodes) =>
              nodes
                .filter((n) => n.getBoundingClientRect().width > 0)
                .every((n) => n.complete && n.naturalWidth > 0),
            );
          assert.equal(imageState, true, `${name}: image not loaded`);
          if (name === "consult") {
            assert.equal((await page.content()).includes("987654.32"), false);
            assert.equal((await page.content()).includes("987.654"), false);
          }
          const screenshot = `${name}-${width}-${colorScheme}.png`;
          await page.screenshot({
            path: path.join(output, screenshot),
            fullPage: true,
          });
          results.push({ name, width, colorScheme, screenshot });
        }
        await page.goto(base + products[0].path, { waitUntil: "networkidle" });
        await page.getByLabel("Cor", { exact: true }).selectOption("Azul");
        await page.getByLabel("Tamanho", { exact: true }).selectOption("P");
        await page.getByLabel(/Acabamento/).selectOption("matte");
        for (const name of ["Ana", "Bia"]) {
          await page.getByLabel(/Nome na peça/).fill(name);
          await page
            .getByRole("button", {
              name: "Adicionar à lista de orçamento",
              exact: true,
            })
            .click();
          await page
            .getByRole("status")
            .filter({ hasText: "Produto adicionado" })
            .waitFor();
        }
        await page.goto(base + "/portfolio/orcamento", {
          waitUntil: "networkidle",
        });
        await page.locator(".store-inquiry-line").first().waitFor();
        assert.equal(await page.locator(".store-inquiry-line").count(), 2);
        await page.reload({ waitUntil: "networkidle" });
        assert.equal(await page.locator(".store-inquiry-line").count(), 2);
        await page
          .getByRole("button", {
            name: "Conferir e preparar contato",
            exact: true,
          })
          .click();
        await page
          .getByLabel("Mensagem de orçamento", { exact: true })
          .waitFor();
        const message = await page
          .getByLabel("Mensagem de orçamento", { exact: true })
          .inputValue();
        assert.match(message, /Ana/);
        assert.match(message, /Bia/);
        const screenshot = `filled-list-${width}-${colorScheme}.png`;
        await page.screenshot({
          path: path.join(output, screenshot),
          fullPage: true,
        });
        results.push({ name: "filled-list", width, colorScheme, screenshot });
        await page
          .getByRole("link", { name: "Editar configuração", exact: true })
          .first()
          .click();
        await page.getByLabel(/Nome na peça/).fill("Ana Maria");
        await page
          .getByRole("button", { name: "Salvar configuração", exact: true })
          .click();
        await page
          .getByRole("status")
          .filter({ hasText: "Configuração atualizada" })
          .waitFor();
        await page.goto(base + "/portfolio/orcamento", {
          waitUntil: "networkidle",
        });
        await page.getByText("Ana Maria", { exact: true }).waitFor();
        // Network recovery preserves the current commercial draft.
        await page.route("**/api/portfolio/inquiry", (route) => route.abort());
        await page.reload({ waitUntil: "networkidle" });
        await page
          .getByRole("alert")
          .filter({ hasText: "Sua lista foi mantida" })
          .waitFor();
        assert.equal(await page.locator(".store-inquiry-line").count(), 2);
        await page.unroute("**/api/portfolio/inquiry");
        await context.close();
      }
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(output, "browser-result.json"),
      JSON.stringify({ results, errors, flows: "passed" }, null, 2),
    );
    console.log(
      `${results.length} visual states and configured-item flows passed`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
