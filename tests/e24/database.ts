export function assertE24DatabaseUrl(raw: string): URL {
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55441" ||
    url.pathname !== "/b2t_e24_test" ||
    url.search ||
    url.hash
  )
    throw Error(
      "E2.4 exige exclusivamente localhost:55441/b2t_e24_test sem parâmetros.",
    );
  return url;
}
