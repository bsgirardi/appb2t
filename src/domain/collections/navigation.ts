type Collection = { id: string; name: string; slug?: string };

function nameToken(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70)
      .replace(/-$/, "") || "colecao"
  );
}

// Include inactive collections before filtering so activation does not change URLs.
// Names are derived, not persisted: renaming changes the friendly URL; IDs remain valid.
export function collectionLinks<T extends Collection>(
  collections: T[],
): (T & { slug: string })[] {
  const bases = collections.map((collection) => nameToken(collection.name));
  const counts = new Map<string, number>();
  for (const base of bases) counts.set(base, (counts.get(base) ?? 0) + 1);
  const reserved = new Set([
    ...bases,
    ...collections.map((collection) => collection.id),
  ]);
  const allocated = new Map<string, string>();
  for (const collection of [...collections].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const base = nameToken(collection.name);
    let slug = base;
    if (
      counts.get(base)! > 1 ||
      collections.some((other) => other.id === base)
    ) {
      const candidate = `${base}-${collection.id}`;
      slug = reserved.has(candidate) ? collection.id : candidate;
    }
    reserved.add(slug);
    allocated.set(collection.id, slug);
  }
  return collections.map((collection) => ({
    ...collection,
    slug: allocated.get(collection.id)!,
  }));
}

export function resolveCollection<T extends Collection>(
  collections: T[],
  token: string,
): T | undefined {
  return (
    collections.find((collection) => collection.id === token) ??
    collections.find((collection) => collection.slug === token)
  );
}
