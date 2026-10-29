export function assertE12DatabaseUrl(raw: string): URL {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "55437" || url.pathname !== "/b2t_e12_test" || url.search || url.hash) throw Error("Testes E1.2 exigem exclusivamente localhost:55437/b2t_e12_test, sem parâmetros.");
  return url;
}
