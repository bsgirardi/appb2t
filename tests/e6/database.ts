export function assertE6DatabaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw Error("Informe E6_TEST_DATABASE_URL para o banco E6 exclusivo.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55436" ||
    url.pathname !== "/b2t_e6_test" ||
    url.search ||
    url.hash
  )
    throw Error(
      "Testes E6 exigem exclusivamente localhost:55436/b2t_e6_test, sem parâmetros.",
    );
  return url;
}
