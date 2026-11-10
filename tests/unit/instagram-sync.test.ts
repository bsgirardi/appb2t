import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { instagramSettingsSchema } from "@/domain/marketing/instagram";
import { instagramSeedPosts } from "@/domain/marketing/instagram-seed";
const state = vi.hoisted(() => ({
  row: { version: 7, storefront: {} as unknown },
}));
vi.mock("@/lib/db", () => {
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    companyAppearance: {
      findUnique: vi.fn(async () => state.row),
      update: vi.fn(
        async ({
          data,
        }: {
          data: { storefront?: unknown; version?: { increment: number } };
        }) => {
          if (data.storefront) state.row.storefront = data.storefront;
          if (data.version) state.row.version += data.version.increment;
          return state.row;
        },
      ),
    },
  };
  return {
    db: { $transaction: async (fn: (tx: unknown) => unknown) => fn(tx) },
  };
});
vi.mock("@/server/instagram-client", async (original) => ({
  ...(await original<typeof import("@/server/instagram-client")>()),
  fetchInstagramPosts: vi.fn(),
}));
import { fetchInstagramPosts, InstagramError } from "@/server/instagram-client";
import {
  syncInstagram,
  saveInstagramSettings,
  instagramPosts,
  instagramSyncDue,
} from "@/server/instagram";
import { storefrontSchema } from "@/domain/appearance/storefront";
beforeEach(() => {
  state.row = {
    version: 7,
    storefront: {
      ...defaultStorefront,
      seo: { title: "Preservar SEO" },
      instagram: { enabled: true, hiddenIds: [] },
    },
  };
  vi.stubEnv("INSTAGRAM_SYNC_ENABLED", "true");
  vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "synthetic-token");
  vi.mocked(fetchInstagramPosts).mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it("automatically checks existing installations without an instagram object", () => {
  expect(instagramSyncDue()).toBe(true);
  expect(
    instagramSyncDue(instagramSettingsSchema.parse({ enabled: false })),
  ).toBe(false);
});
it("stores authoritative posts while preserving SEO and editable version; then saves moderation without losing snapshot", async () => {
  vi.mocked(fetchInstagramPosts).mockResolvedValue([instagramSeedPosts[0]]);
  await syncInstagram();
  const current = storefrontSchema.parse(state.row.storefront);
  expect(current.seo?.title).toBe("Preservar SEO");
  expect(current.instagram?.posts?.[0].id).toBe(instagramSeedPosts[0].id);
  expect(current.instagram?.lastSuccessAt).toBeTruthy();
  expect(state.row.version).toBe(7);
  await saveInstagramSettings(
    { id: "a", name: "Admin", email: "a@example.test", role: "ADMIN" },
    {
      expectedVersion: 7,
      enabled: true,
      hiddenIds: [instagramSeedPosts[0].id],
    },
  );
  expect(state.row.version).toBe(8);
  expect(
    instagramPosts(storefrontSchema.parse(state.row.storefront).instagram),
  ).toEqual([]);
});
it("preserves last good copy on provider failure and throttles repeated attempts", async () => {
  state.row.storefront = {
    ...defaultStorefront,
    instagram: {
      enabled: true,
      hiddenIds: [],
      posts: [instagramSeedPosts[0]],
      lastSuccessAt: "2026-11-01T00:00:00Z",
    },
  };
  vi.mocked(fetchInstagramPosts).mockRejectedValue(
    new InstagramError("authorization"),
  );
  await syncInstagram();
  await syncInstagram(true);
  const settings = storefrontSchema.parse(state.row.storefront).instagram!;
  expect(settings.lastError).toBe("authorization");
  expect(settings.posts).toHaveLength(1);
  expect(settings.lastSuccessAt).toBe("2026-11-01T00:00:00Z");
  expect(fetchInstagramPosts).toHaveBeenCalledTimes(1);
});
it("does not replace a successful empty feed with the seed, or call Meta while disabled", async () => {
  vi.mocked(fetchInstagramPosts).mockResolvedValue([]);
  await syncInstagram();
  expect(
    instagramPosts(storefrontSchema.parse(state.row.storefront).instagram),
  ).toEqual([]);
  vi.stubEnv("INSTAGRAM_SYNC_ENABLED", "false");
  await syncInstagram(true);
  expect(fetchInstagramPosts).toHaveBeenCalledTimes(1);
  expect(
    instagramPosts(instagramSettingsSchema.parse({ enabled: false })),
  ).toEqual([]);
});
