// @vitest-environment jsdom
import { expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AppearanceColorPreviews } from "@/components/settings/appearance-colors";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps the form and preview in separate grid columns without an orphan guide", () => {
  const { container } = render(
    <AppearancePanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 0 }}
    />,
  );
  const grid = container.querySelector(".product-edit-grid")!;
  expect(Array.from(grid.children, (node) => node.tagName)).toEqual([
    "FORM",
    "ASIDE",
  ]);
  expect(grid.querySelector("form .admin-required-guide")).toBeTruthy();
});
it("previews escaped identity locally before explicit saving", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const { container } = render(
    <AppearancePanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 0 }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome da empresa"), {
    target: { value: "<script>Empresa</script>" },
  });
  expect(
    screen.getByRole("heading", { name: "<script>Empresa</script>" }),
  ).toBeTruthy();
  expect(container.querySelector("script")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("edits and saves both palettes independently after explicit submission", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        ...defaultAppearance,
        siteLightPrimary: "#224455",
        lightPrimary: "#663399",
        logoUrl: null,
        version: 1,
      },
    }),
  } as Response);
  render(
    <AppearancePanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 0 }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Site · Cor principal · tema claro"), {
    target: { value: "#224455" },
  });
  expect(
    (
      screen.getByLabelText(
        "Administrativo · Cor principal · tema claro",
      ) as HTMLInputElement
    ).value,
  ).toBe(defaultAppearance.lightPrimary);
  fireEvent.change(
    screen.getByLabelText("Administrativo · Cor principal · tema claro"),
    { target: { value: "#663399" } },
  );
  expect(
    (
      screen.getByLabelText(
        "Site · Cor principal · tema claro",
      ) as HTMLInputElement
    ).value,
  ).toBe("#224455");
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Salvar aparência" }));
  await screen.findByText("Aparência do site e do administrativo atualizada.");
  const body = fetch.mock.calls[0][1]!.body as FormData;
  expect(JSON.parse(body.get("data") as string)).toMatchObject({
    siteLightPrimary: "#224455",
    lightPrimary: "#663399",
    expectedVersion: 0,
  });
});

it("uses the storefront foreground color in its site preview", () => {
  render(
    <AppearanceColorPreviews
      value={{ ...defaultAppearance, logoUrl: null, version: 0 }}
    />,
  );
  const site = screen.getByRole("region", { name: "Prévia de cores · Site" });
  const swatches = site.querySelectorAll<HTMLElement>(".appearance-swatch");
  expect(swatches[1].style.color).toBe("rgb(13, 43, 82)");
});

it("saves the choice to hide the initial banner without clearing its content", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      data: { ...defaultAppearance, logoUrl: null, version: 1 },
    }),
  } as Response);
  render(
    <AppearancePanel
      initial={{ ...defaultAppearance, logoUrl: null, version: 0 }}
    />,
  );
  const toggle = screen.getByRole("checkbox", {
    name: "Exibir banner inicial",
  });
  expect((toggle as HTMLInputElement).checked).toBe(true);
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: "Salvar aparência" }));
  await screen.findByText("Aparência do site e do administrativo atualizada.");
  const body = fetch.mock.calls[0][1]!.body as FormData;
  expect(JSON.parse(body.get("data") as string).storefront.showHero).toBe(
    false,
  );
});
