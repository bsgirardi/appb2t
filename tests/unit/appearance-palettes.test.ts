import { expect, it } from "vitest";
import {
  appearanceSchema,
  defaultAppearance,
} from "@/domain/appearance/validation";
import { themeVariables, siteThemeVariables } from "@/domain/appearance/theme";

it("validates site colors without replacing omitted legacy-client values", () => {
  const old = { ...defaultAppearance, expectedVersion: 0 };
  for (const key of [
    "siteLightPrimary",
    "siteLightAccent",
    "siteDarkPrimary",
    "siteDarkAccent",
  ] as const)
    delete (old as Record<string, unknown>)[key];
  expect(appearanceSchema.parse(old)).not.toHaveProperty("siteLightPrimary");
  for (const key of [
    "siteLightPrimary",
    "siteLightAccent",
    "siteDarkPrimary",
    "siteDarkAccent",
  ]) {
    expect(
      appearanceSchema.safeParse({ ...old, [key]: "red;display:none" }).success,
    ).toBe(false);
    expect(
      appearanceSchema.safeParse({ ...old, [key]: "#224455" }).success,
    ).toBe(true);
  }
});
it("keeps the site palette independent from admin and vice versa", () => {
  const baseline = { ...defaultAppearance, logoUrl: null };
  expect(
    siteThemeVariables({
      ...baseline,
      lightPrimary: "#224455",
      darkAccent: "#ffffff",
    }),
  ).toEqual(siteThemeVariables(baseline));
  expect(
    themeVariables({
      ...baseline,
      siteLightPrimary: "#224455",
      siteDarkAccent: "#ffffff",
    }),
  ).toEqual(themeVariables(baseline));
  expect(
    siteThemeVariables({ ...baseline, siteLightPrimary: "#224455" })[
      "--site-light-primary"
    ],
  ).toBe("#224455");
});
it("preserves the current storefront colors when older callers omit site fields", () => {
  const value = siteThemeVariables({});
  expect(value["--site-light-primary"]).toBe("#0066cc");
  expect(value["--site-dark-primary"]).toBe("#79b8ff");
  expect(value["--site-light-accent"]).toBe("#ff7a00");
  expect(value["--site-dark-accent"]).toBe("#ff7a00");
});
