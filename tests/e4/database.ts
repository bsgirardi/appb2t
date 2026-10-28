export function assertE4DatabaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Informe E4_TEST_DATABASE_URL para o banco E4 exclusivo.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55434" ||
    url.pathname !== "/b2t_e4_test" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Testes E4 exigem exclusivamente localhost:55434/b2t_e4_test, sem parâmetros.",
    );
  return url;
}
