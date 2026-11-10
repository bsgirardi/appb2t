// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StoreAnalytics } from "@/components/products/store-analytics";
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.gtag;
  delete window.dataLayer;
  delete window.b2tAnalyticsId;
  document
    .querySelectorAll('script[src*="googletagmanager"]')
    .forEach((node) => node.remove());
});
it("loads no tag before an explicit choice and deduplicates Strict Mode pageviews", () => {
  window.history.replaceState(null, "", "/?email=cliente%40test.com");
  render(
    <StrictMode>
      <StoreAnalytics measurementId="G-TEST1234" />
    </StrictMode>,
  );
  expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Aceitar medição" }));
  expect(
    document.querySelectorAll('script[src*="googletagmanager"]'),
  ).toHaveLength(1);
  const commands = (window.dataLayer ?? []).map((value) =>
    Array.from(value as ArrayLike<unknown>),
  );
  expect(
    commands.filter((row) => row[0] === "event" && row[1] === "page_view"),
  ).toHaveLength(1);
  expect(JSON.stringify(commands)).not.toContain("cliente");
  expect(commands.find((row) => row[0] === "config")?.[2]).toMatchObject({
    send_page_view: false,
  });
});
it("allows declining without loading Google", () => {
  render(<StoreAnalytics measurementId="G-TEST1234" />);
  fireEvent.click(
    screen.getByRole("button", { name: "Continuar sem medição" }),
  );
  expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  expect(window.dataLayer).toBeUndefined();
  expect(
    (window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"],
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Permitir medição" }));
  expect(
    (window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"],
  ).toBe(false);
  expect(
    document.querySelectorAll('script[src*="googletagmanager"]'),
  ).toHaveLength(1);
});
