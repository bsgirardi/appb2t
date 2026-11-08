import { expect, it } from "vitest";
import { relationshipReturn } from "@/lib/relationship-return";
it("preserves the list query and rejects unrelated or external destinations", () => {
  for (const route of ["/negociacoes", "/solicitacoes"] as const) {
    const target = `${route}?search=Nome%20longo&page=3&state=RECEBIDA`;
    expect(relationshipReturn(target, route)).toBe(target);
    for (const invalid of [
      "https://example.test",
      "//example.test",
      `${route}/other`,
      `${route}x?foo`,
      `${route}?q=ok#bad`,
      `${route}?q=\n`,
      `${route}\\bad`,
      [],
      undefined,
    ]) {
      expect(relationshipReturn(invalid, route)).toBe(route);
    }
  }
});
