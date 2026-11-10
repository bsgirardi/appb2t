import { expect, it } from "vitest";
import {
  newestInstagramPosts,
  instagramSettingsSchema,
  isInstagramCdn,
  parseInstagramMedia,
} from "@/domain/marketing/instagram";
it("orders by publication timestamp, ignoring pinned/source order, and deduplicates", () => {
  const posts = [
    {
      id: "old",
      publishedAt: "2026-09-15",
      title: "Fixado",
      image: "/instagram/old.webp",
      permalink: "https://www.instagram.com/somosb2t/p/old/",
      kind: "IMAGE" as const,
    },
    {
      id: "new",
      publishedAt: "2026-11-05",
      title: "Novo",
      image: "/instagram/new.webp",
      permalink: "https://www.instagram.com/somosb2t/reel/new/",
      kind: "VIDEO" as const,
    },
  ];
  expect(
    newestInstagramPosts([...posts, posts[1]], []).map((p) => p.id),
  ).toEqual(["new", "old"]);
  expect(newestInstagramPosts(posts, ["new"]).map((p) => p.id)).toEqual([
    "old",
  ]);
});
it("rejects unsafe image hosts and invalid/foreign post URLs", () => {
  for (const url of [
    "http://scontent.cdninstagram.com/x",
    "https://evil.test/x",
    "https://cdninstagram.com.evil.test/x",
    "https://user:password@scontent.cdninstagram.com/x",
    "https://scontent.cdninstagram.com:444/x",
  ])
    expect(isInstagramCdn(url)).toBe(false);
  expect(
    isInstagramCdn("https://scontent.cdninstagram.com/x.jpg?signature=public"),
  ).toBe(true);
  expect(
    instagramSettingsSchema.safeParse({ hiddenIds: ["../secret"] }).success,
  ).toBe(false);
});
it("uses video thumbnail, real timestamp and safe plain text, without rendering captions as HTML", () => {
  const post = parseInstagramMedia({
    id: "123",
    media_type: "VIDEO",
    thumbnail_url: "https://scontent.cdninstagram.com/thumb.jpg",
    media_url: "https://scontent.cdninstagram.com/video.mp4",
    timestamp: "2026-11-05T14:30:00+0000",
    caption: "<script> texto",
    permalink: "https://www.instagram.com/reel/real/",
  });
  expect(post?.sourceImage).toContain("thumb.jpg");
  expect(post?.publishedAt).toBe("2026-11-05T14:30:00.000Z");
  expect(post?.id).toBe("real");
  expect(post && newestInstagramPosts([post], ["real"])).toEqual([]);
  expect(
    parseInstagramMedia({
      id: "123",
      media_type: "VIDEO",
      timestamp: "invalid",
    }),
  ).toBeNull();
});
