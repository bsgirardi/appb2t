// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Login from "@/app/login/page";
import { AppShell } from "@/components/shell/app-shell";
import Updates from "@/app/(private)/atualizacoes/page";
import { defaultAppearance } from "@/domain/appearance/validation";
import { APP_VERSION } from "@/lib/version";
import manifest from "../../package.json";
import lock from "../../package-lock.json";
import { releases } from "@/lib/releases";
vi.mock("next/navigation", () => ({
  usePathname: () => "/atualizacoes",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/server/appearance", () => ({
  getPublicAppearance: async () => ({ ...defaultAppearance, logoUrl: null }),
}));
afterEach(cleanup);
it("verifies the delivered manifests, history and actual login footer", async () => {
  expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  expect(manifest.version).toBe(APP_VERSION);
  expect(lock.version).toBe(APP_VERSION);
  expect(lock.packages[""].version).toBe(APP_VERSION);
  expect(releases[0].version).toBe(APP_VERSION);
  render(await Login({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText(`Versão ${APP_VERSION}`)).toBeTruthy();
});
it.each(["ADMIN", "OPERATOR"] as const)(
  "renders version and updates for %s",
  (role) => {
    render(
      <AppShell
        actor={{
          id: "preview",
          name: "Equipe de teste",
          email: "preview@example.test",
          role,
        }}
      >
        <Updates />
      </AppShell>,
    );
    expect(screen.getByText(`Versão atual: ${APP_VERSION}`)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: `Versão ${APP_VERSION} · Atualizações` })
        .getAttribute("href"),
    ).toBe("/atualizacoes");
  },
);
