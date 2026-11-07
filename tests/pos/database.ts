export function assertPosDatabaseUrl(raw: string) {
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55441" ||
    url.pathname !== "/b2t_pdv_test" ||
    url.search ||
    url.hash
  )
    throw new Error("PDV exige banco exclusivo 127.0.0.1:55441/b2t_pdv_test");
  return url;
}
