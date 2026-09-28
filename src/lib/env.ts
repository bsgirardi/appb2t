export function appUrl(): URL {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("APP_URL inválida.");
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("APP_URL externa exige HTTPS.");
  return url;
}
