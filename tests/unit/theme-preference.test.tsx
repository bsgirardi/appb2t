// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ThemeController, ThemeToggle } from "@/components/theme-toggle";
import { themeBootstrap } from "@/lib/theme-preference";
let dark = false;
let change: () => void;
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
  dark = false;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_t: string, fn: () => void) => {
        change = fn;
      },
      removeEventListener: vi.fn(),
    })),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("cycles automatic/light/dark, persists and updates every visible control", () => {
  render(
    <>
      <ThemeController />
      <ThemeToggle />
      <ThemeToggle />
    </>,
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: /Tema atual: automático/ })[0],
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("b2t:theme")).toBe("light");
  expect(
    screen.getAllByRole("button", { name: /Tema atual: claro/ }),
  ).toHaveLength(2);
  fireEvent.click(
    screen.getAllByRole("button", { name: /Tema atual: claro/ })[0],
  );
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(
    screen.getAllByRole("button", { name: /Tema atual: escuro/ })[0],
  );
  expect(document.documentElement.dataset.themePreference).toBe("system");
});
it("follows system changes only in automatic mode and synchronizes another tab", () => {
  render(
    <>
      <ThemeController />
      <ThemeToggle />
    </>,
  );
  dark = true;
  act(() => change());
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(
    screen.getByRole("button", { name: /Tema atual: automático/ }),
  );
  act(() => change());
  expect(document.documentElement.dataset.theme).toBe("light");
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "b2t:theme",
        newValue: "dark",
        storageArea: localStorage,
      }),
    ),
  );
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(
    screen.getByRole("button", { name: /Tema atual: escuro/ }),
  ).toBeTruthy();
});
it("restores saved choice before paint and rejects invalid persisted values", () => {
  localStorage.setItem("b2t:theme", "light");
  dark = true;
  new Function(themeBootstrap)();
  expect(document.documentElement.dataset.theme).toBe("light");
  localStorage.setItem("b2t:theme", "invalid");
  new Function(themeBootstrap)();
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.dataset.themePreference).toBe("system");
});
it("still lets the user switch when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => new Function(themeBootstrap)()).not.toThrow();
  render(
    <>
      <ThemeController />
      <ThemeToggle />
    </>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Tema atual: automático/ }),
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(
    screen.getByRole("button", { name: /Tema atual: claro/ }),
  ).toBeTruthy();
});
