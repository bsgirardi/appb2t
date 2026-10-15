// Run only against the disposable appearance validation instance.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS validation script. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.APPEARANCE_TEST_URL;
if (base !== "http://localhost:3102")
  throw new Error("Only the isolated port 3102 is allowed");
const email = process.env.APPEARANCE_TEST_EMAIL;
const password = process.env.APPEARANCE_TEST_PASSWORD;
if (!email || !password)
  throw new Error("Disposable test credentials required");
const output = path.resolve("test-results/appearance-browser");
const labels = [
  "Cor principal · tema claro",
  "Cor de destaque · tema claro",
  "Cor principal · tema escuro",
  "Cor de destaque · tema escuro",
];
const site = ["#2244aa", "#ff8800", "#88bbff", "#ffaa44"];
const admin = ["#663399", "#996600", "#bb99ee", "#eedd88"];
const results = [];
async function values(page, area) {
  return Promise.all(
    labels.map((label) =>
      page.getByLabel(`${area} · ${label}`, { exact: true }).inputValue(),
    ),
  );
}
async function save(page) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/appearance") && r.request().method() === "PUT",
  );
  await page
    .getByRole("button", { name: "Salvar aparência", exact: true })
    .click();
  const result = await response;
  assert.equal(result.status(), 200, await result.text());
  await page
    .getByText("Aparência do site e do administrativo atualizada.", {
      exact: true,
    })
    .waitFor();
  await page.reload();
}
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Horizontal overflow",
  );
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    const errors = [],
      warnings = [];
    page.on("response", (r) => {
      if (r.status() >= 400) console.log("HTTP error", r.status(), r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const entry = { message: m.text(), location: m.location() };
      if (
        entry.location.url === base + "/favicon.ico" &&
        m.text().includes("404")
      )
        warnings.push(entry);
      else errors.push(entry);
    });
    await page.goto(base + "/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no workspace" }).click();
    await page.waitForURL(base + "/calculadora");
    await page.goto(base + "/configuracoes/aparencia");
    const initialAdmin = await values(page, "Administrativo");
    for (let i = 0; i < 4; i++) {
      await page
        .getByLabel(`Site · ${labels[i]}`, { exact: true })
        .fill(site[i]);
      await page
        .getByRole("region", { name: "Prévia de cores · Site", exact: true })
        .getByText(site[i], { exact: true })
        .waitFor();
    }
    assert.deepEqual(await values(page, "Administrativo"), initialAdmin);
    await save(page);
    assert.deepEqual(await values(page, "Site"), site);
    assert.deepEqual(await values(page, "Administrativo"), initialAdmin);
    results.push(
      "Site preview, save, reload and administrative palette preservation passed",
    );
    for (let i = 0; i < 4; i++) {
      await page
        .getByLabel(`Administrativo · ${labels[i]}`, { exact: true })
        .fill(admin[i]);
      await page
        .getByRole("region", {
          name: "Prévia de cores · Administrativo",
          exact: true,
        })
        .getByText(admin[i], { exact: true })
        .waitFor();
    }
    await save(page);
    assert.deepEqual(await values(page, "Site"), site);
    assert.deepEqual(await values(page, "Administrativo"), admin);
    results.push(
      "Administrative preview, save, reload and site palette preservation passed",
    );
    for (const colorScheme of ["light", "dark"])
      for (const width of [390, 1440]) {
        const label = `${colorScheme}-${width}`;
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.goto(base + "/configuracoes/aparencia");
        await page
          .getByRole("heading", { name: "Aparência", exact: true })
          .waitFor();
        await page.evaluate(() => document.fonts.ready);
        await noOverflow(page);
        const primary = await page
          .locator(".app-shell")
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue("--primary").trim(),
          );
        assert.equal(primary, admin[colorScheme === "light" ? 0 : 2]);
        await page.screenshot({
          path: path.join(output, `admin-${label}.png`),
          fullPage: true,
        });
        if (width === 390) {
          await page.getByRole("button", { name: "Menu", exact: true }).click();
          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          assert.equal(
            await dialog.evaluate((el) =>
              getComputedStyle(el).getPropertyValue("--primary").trim(),
            ),
            primary,
          );
          assert.equal(
            await page
              .getByRole("button", { name: "Fechar", exact: true })
              .evaluate((el) => el === document.activeElement),
            true,
          );
          await page.keyboard.press("Shift+Tab");
          assert.equal(
            await page
              .getByRole("link", { name: "Minha conta", exact: true })
              .evaluate((el) => el === document.activeElement),
            true,
          );
          await page.keyboard.press("Tab");
          await page.screenshot({
            path: path.join(output, `menu-${label}.png`),
          });
          await page.keyboard.press("Escape");
          assert.equal(
            await page
              .getByRole("button", { name: "Menu", exact: true })
              .evaluate((el) => el === document.activeElement),
            true,
          );
        }
        await page.goto(base + "/");
        await page.evaluate(() => document.fonts.ready);
        await noOverflow(page);
        assert.equal(
          await page
            .locator(".storefront")
            .evaluate((el) =>
              getComputedStyle(el).getPropertyValue("--primary").trim(),
            ),
          site[colorScheme === "light" ? 0 : 2],
        );
        await page.screenshot({
          path: path.join(output, `site-${label}.png`),
          fullPage: true,
        });
        results.push(
          `${label}: admin/site active palette, layout and screenshots passed${width === 390 ? ", mobile menu and keyboard passed" : ""}`,
        );
      }
    assert.deepEqual(errors, [], "Browser errors");
    await fs.writeFile(
      path.join(output, "result.json"),
      JSON.stringify(
        { passed: true, results, screenshots: 10, warnings },
        null,
        2,
      ),
    );
    console.log(results.join("\n"));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
