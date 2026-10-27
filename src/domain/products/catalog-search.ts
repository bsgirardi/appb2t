/** Keep the original tokens for display; the database normalizes both sides. */
export function searchTerms(search: string): string[] {
  const seen = new Set<string>();
  return search
    .trim()
    .slice(0, 100)
    .split(/\s+/u)
    .filter((term) => {
      const key =
        term.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() || term;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function typoDistance(term: string): number {
  const letters = term.normalize("NFD").replace(/\p{M}/gu, "");
  if (!/^\p{L}+$/u.test(letters)) return 0;
  const length = Array.from(letters).length;
  return length < 4 ? 0 : length < 9 ? 1 : 2;
}
