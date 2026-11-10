export function analyticsPage(pathname: string): string | null {
  if (
    ["/", "/catalogo", "/portfolio/sobre", "/portfolio/ajuda"].includes(
      pathname,
    )
  )
    return pathname;
  if (/^\/portfolio\/produto\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(pathname))
    return "/portfolio/produto/item";
  return null;
}
// Closed vocabulary only: arbitrary UTM values can themselves contain personal data.
const utms: Record<string, Set<string>> = {
  utm_source: new Set(["instagram", "google", "facebook"]),
  utm_medium: new Set(["social", "organic", "cpc", "referral"]),
  utm_campaign: new Set(["institucional", "catalogo", "personalizados"]),
  utm_content: new Set(["bio", "stories", "reels", "post"]),
};
export function analyticsLocation(raw: string): string | null {
  const url = new URL(raw);
  const path = analyticsPage(url.pathname);
  if (!path) return null;
  const safe = new URL(path, url.origin);
  for (const [key, values] of Object.entries(utms)) {
    const value = url.searchParams.get(key);
    if (value && values.has(value)) safe.searchParams.set(key, value);
  }
  return safe.href;
}
