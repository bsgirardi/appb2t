// @vitest-environment jsdom
import { Children, cloneElement, isValidElement, Suspense } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/server/auth/guards", () => ({
  requireActor: async () => ({ id: "admin", role: "ADMIN" }),
}));
vi.mock("@/server/dashboard/panels", () => ({ getDashboardPanel: vi.fn() }));
vi.mock("@/components/dashboard/dashboard-panel", () => ({
  DashboardPanel: () => null,
}));
vi.mock("@/components/dashboard/dashboard-toolbar", () => ({
  DashboardToolbar: ({ filter }: { filter: { panel: string } }) => (
    <div aria-label="Seleção do dashboard">{filter.panel}</div>
  ),
}));
import DashboardPage from "@/app/(private)/dashboard/page";

afterEach(cleanup);

// Resolve only the data boundary: keep the page's real sibling keys and layout.
async function page(panel: string) {
  const result = await DashboardPage({
    searchParams: Promise.resolve({ panel }),
  });
  return cloneElement(
    result,
    {},
    Children.map(result.props.children, (child) =>
      isValidElement(child) && child.type === Suspense
        ? cloneElement(child, {}, <div>Indicadores</div>)
        : child,
    ),
  );
}

it("keeps a single dashboard selector after consecutive panel changes", async () => {
  const { rerender } = render(await page("overview"));
  for (const panel of ["commercial", "production", "stock", "overview"]) {
    rerender(await page(panel));
    const selectors = screen.getAllByLabelText("Seleção do dashboard");
    expect(selectors).toHaveLength(1);
    expect(selectors[0].textContent).toBe(panel);
  }
});
