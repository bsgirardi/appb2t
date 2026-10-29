// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  copyDraftText,
  downloadDraft,
} from "@/components/advertising/ad-client";
import { api } from "@/lib/client-api";
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
it("allows clipboard retry after browser refusal", async () => {
  const writeText = vi
    .fn()
    .mockRejectedValueOnce(Error("denied"))
    .mockResolvedValueOnce(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  vi.mocked(api).mockResolvedValue({ text: "Texto revisado" });
  await expect(copyDraftText("draft", 3)).rejects.toThrow("Tente novamente");
  await copyDraftText("draft", 3);
  expect(writeText).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenLastCalledWith("/api/anuncios/draft/copiar", {
    expectedVersion: 3,
  });
});
it("keeps structured conflict errors and permits a download retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: "CONFLICT", message: "Revisão antiga" },
        }),
        { status: 409 },
      ),
    )
    .mockResolvedValueOnce(
      new Response("zip", {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="material.zip"',
        },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:material"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  await expect(downloadDraft("draft", 3)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect(click).not.toHaveBeenCalled();
  await downloadDraft("draft", 4);
  expect(click).toHaveBeenCalledOnce();
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    expectedVersion: 4,
  });
});
