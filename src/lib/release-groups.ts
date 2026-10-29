import type { Release } from "./releases";

function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** Presentation only: the original releases and their notes remain intact. */
export function groupReleasesByDate(releases: readonly Release[]): Release[] {
  const days = new Map<string, Release>();
  const ordered = [...releases].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || compareVersions(b.version, a.version),
  );
  for (const release of ordered) {
    let day = days.get(release.date);
    if (!day) {
      day = { ...release, sections: [] };
      days.set(release.date, day);
    }
    for (const section of release.sections) {
      const existing = day.sections.find((s) => s.title === section.title);
      if (existing) existing.items.push(...section.items);
      else day.sections.push({ ...section, items: [...section.items] });
    }
  }
  const categories = ["Novidades", "Melhorias", "Correções"];
  for (const day of days.values()) {
    day.sections.sort((a, b) => {
      const rank = (title: string) => {
        const index = categories.indexOf(title);
        return index === -1 ? categories.length : index;
      };
      return rank(a.title) - rank(b.title);
    });
  }
  return [...days.values()];
}
