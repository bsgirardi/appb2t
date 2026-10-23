import { expect, it } from "vitest";
import { readArtUpload, artFileResponse } from "@/server/art/http";
import { appUrl } from "@/lib/env";

it("requires same origin and bounds actual upload bytes even without Content-Length", async () => {
  const headers = {
    origin: appUrl().origin,
    "content-type": "application/octet-stream",
    "x-art-filename": "arte.png",
    "x-art-purpose": "FINAL",
    "x-art-version": "1",
    "x-operation-key": "upload-key",
  };
  const parsed = await readArtUpload(
    new Request(appUrl(), {
      method: "POST",
      headers,
      body: new Uint8Array([1, 2]),
    }),
  );
  expect(parsed.file.bytes).toEqual(new Uint8Array([1, 2]));
  await expect(
    readArtUpload(
      new Request(appUrl(), {
        method: "POST",
        headers: { ...headers, origin: "https://other.test" },
        body: new Uint8Array([1]),
      }),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    readArtUpload(
      new Request(appUrl(), {
        method: "POST",
        headers,
        body: new Uint8Array(10 * 1024 * 1024 + 1),
      }),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("serves PDF only as private download with sanitized filename", async () => {
  const response = artFileResponse(
    {
      bytes: new Uint8Array([1]),
      mimeType: "application/pdf",
      name: 'x\r\n".pdf',
      preview: null,
    },
    false,
  );
  expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
  expect(response.headers.get("content-disposition")).not.toMatch(/[\r\n]/);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
});
