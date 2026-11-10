import { afterEach, expect, it, vi } from "vitest";
import { fetchInstagramPosts } from "@/server/instagram-client";
afterEach(() => vi.unstubAllGlobals());
it("verifies somosb2t before importing and sends token only to the official host", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: [{ user_id: "123", username: "somosb2t" }] }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "456",
              caption: "Natal",
              media_type: "VIDEO",
              timestamp: "2026-11-05T14:00:00+0000",
              thumbnail_url: "https://scontent.cdninstagram.com/photo.jpg",
              permalink: "https://www.instagram.com/reel/real/",
            },
          ],
        }),
      ),
    );
  vi.stubGlobal("fetch", request);
  const posts = await fetchInstagramPosts("test-secret", "v27.0");
  expect(posts[0].id).toBe("real");
  expect(request.mock.calls[1][0].toString()).toContain("/v27.0/123/media");
  expect(request.mock.calls[0][0].toString()).not.toContain("test-secret");
  expect(request.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer test-secret",
  );
});
it("rejects another account without importing its media", async () => {
  const request = vi.fn(
    async () =>
      new Response(JSON.stringify({ user_id: "123", username: "another" })),
  );
  vi.stubGlobal("fetch", request);
  await expect(fetchInstagramPosts("secret", "v27.0")).rejects.toMatchObject({
    code: "wrong_account",
  });
  expect(request).toHaveBeenCalledTimes(1);
});
it("sanitizes authentication failures instead of exposing provider responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 190, message: "secret token details" },
          }),
          { status: 400 },
        ),
    ),
  );
  await expect(fetchInstagramPosts("secret", "v27.0")).rejects.toMatchObject({
    code: "authorization",
    message: "Instagram indisponível.",
  });
});
