// @vitest-environment jsdom
import { expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { defaultAppearance } from "@/domain/appearance/validation";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
