export function assertE5DatabaseUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Informe E5_TEST_DATABASE_URL para o banco E5 exclusivo."); }
  if (!["postgres:","postgresql:"].includes(url.protocol) || !["localhost","127.0.0.1"].includes(url.hostname) || url.port!=="55435" || url.pathname!=="/b2t_e5_test" || url.search || url.hash)
    throw new Error("Testes E5 exigem exclusivamente localhost:55435/b2t_e5_test, sem parâmetros.");
  return url;
}
