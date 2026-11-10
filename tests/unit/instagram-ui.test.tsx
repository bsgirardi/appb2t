// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StoreInstagram } from "@/components/products/store-instagram";
import { InstagramPanel } from "@/components/settings/instagram-panel";
import { instagramSeedPosts } from "@/domain/marketing/instagram-seed";
import { instagramSettingsSchema } from "@/domain/marketing/instagram";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("renders local thumbnails, original dates, no autoplay or third-party embeds", () => {
  const { container } = render(<StoreInstagram posts={instagramSeedPosts} />);
  expect(container.querySelectorAll("article")).toHaveLength(6);
  expect(container.querySelector("time")?.dateTime).toBe("2026-11-05");
  expect(container.querySelector("iframe,video,script")).toBeNull();
  for (const image of container.querySelectorAll("img"))
    expect(image.src).not.toContain("cdninstagram");
  expect(
    screen.getAllByRole("link", { name: /no Instagram/ }).length,
  ).toBeGreaterThan(0);
});
it("shows disconnected state and saves hidden IDs without credentials or provider data", async () => {
  const settings = instagramSettingsSchema.parse({});
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { version: 8, settings } })),
    );
  render(
    <InstagramPanel
      initial={settings}
      initialVersion={7}
      configured={false}
      automaticEnabled={false}
    />,
  );
  expect(
    screen.getByText("Conta ainda não conectada à API no servidor"),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Atualizar agora",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Mostrar: Ideias para o Natal/ }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
  await screen.findByText("Preferências do Instagram salvas.");
  expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({
    expectedVersion: 7,
    enabled: true,
    hiddenIds: ["DfYXeoOx7LZ"],
  });
});
it("keeps the original publication accessible when a remote cover expires", () => {
  const { container } = render(
    <StoreInstagram posts={[instagramSeedPosts[0]]} />,
  );
  fireEvent.error(container.querySelector("img")!);
  expect(screen.getByText("Imagem temporariamente indisponível")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Assistir no Instagram" })
      .getAttribute("href"),
  ).toBe(instagramSeedPosts[0].permalink);
});
