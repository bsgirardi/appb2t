// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { parseCatalogSubmission } from "@/domain/catalog-requests/validation";
import { requestSubmission } from "../fixtures/catalog-request";
beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});
it("preserves pending content across reload and strips contact after receipt", async () => {
  const a = await import("@/lib/catalog-request-attempt");
  const pending = a.createRequestAttempt(
    parseCatalogSubmission(requestSubmission),
  );
  a.writeRequestAttempt(pending);
  vi.resetModules();
  const reloaded = await import("@/lib/catalog-request-attempt");
  expect(reloaded.readRequestAttempt()).toEqual(pending);
  reloaded.confirmRequestAttempt({
    protocol: "SOL-000001",
    acceptedAt: "2026-10-20T12:00:00Z",
    received: true,
  });
  expect(sessionStorage.getItem("b2t:request:attempt:v1")).not.toContain(
    "Ana Silva",
  );
  expect(sessionStorage.getItem("b2t:request:attempt:v1")).not.toContain(
    "items",
  );
});
it("uses newest memory content if session storage refuses writes and refuses silent replacement", async () => {
  const a = await import("@/lib/catalog-request-attempt");
  const pending = a.createRequestAttempt(
    parseCatalogSubmission(requestSubmission),
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("quota");
  });
  expect(a.writeRequestAttempt(pending).storage).toBe("memory");
  expect(a.readRequestAttempt()).toEqual(pending);
  expect(() =>
    a.writeRequestAttempt(
      a.createRequestAttempt({
        ...parseCatalogSubmission(requestSubmission),
        contact: { ...pending.payload.contact, name: "Outra" },
      }),
    ),
  ).toThrow();
});
it("clears only sent lines whose content and identity are unchanged", async () => {
  const { clearSubmittedLines } = await import("@/lib/catalog-request-attempt");
  const sent = parseCatalogSubmission(requestSubmission).items;
  const changed = { ...sent[0], quantity: 2 };
  const added = { ...sent[0], lineId: "new-line", productId: "new-product" };
  expect(clearSubmittedLines([changed, added], sent)).toEqual([changed, added]);
  expect(clearSubmittedLines([...sent, added], sent)).toEqual([added]);
});
it("does not silently overwrite corrupt pending storage", async () => {
  sessionStorage.setItem("b2t:request:attempt:v1", "{broken");
  const a = await import("@/lib/catalog-request-attempt");
  expect(() => a.readRequestAttempt()).toThrow();
  expect(() =>
    a.writeRequestAttempt(
      a.createRequestAttempt(parseCatalogSubmission(requestSubmission)),
    ),
  ).toThrow();
  expect(sessionStorage.getItem("b2t:request:attempt:v1")).toBe("{broken");
});
