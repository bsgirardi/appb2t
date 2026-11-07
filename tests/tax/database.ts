export function assertTaxDatabase(value = process.env.DATABASE_URL) {
  const url = new URL(value ?? "");
  if (
    process.env.TAX_DISPOSABLE_DATABASE !== "1" ||
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/b2t_tax_test" ||
    url.username !== "tax_test" ||
    !url.port
  )
    throw new Error(
      "Tributação exige banco sintético exclusivo b2t_tax_test e autorização TAX_DISPOSABLE_DATABASE=1.",
    );
}
