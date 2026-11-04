export function assertE22DatabaseUrl(raw: string): URL {
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55438" ||
    url.pathname !== "/b2t_e22_test" ||
    url.search ||
    url.hash
  )
    throw Error(
      "Testes E2.2 exigem exclusivamente localhost:55438/b2t_e22_test, sem parâmetros.",
    );
  return url;
}
