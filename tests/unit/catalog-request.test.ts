import { describe, expect, it } from "vitest";
import { parseCatalogSubmission } from "@/domain/catalog-requests/validation";
import { canonicalSubmission } from "@/domain/catalog-requests/identity";
import { canChangeRequest } from "@/domain/catalog-requests/states";
import { requestSubmission } from "../fixtures/catalog-request";
const parse = (patch: Record<string, unknown> = {}) =>
  parseCatalogSubmission({ ...requestSubmission, ...patch });
describe("catalog request contracts", () => {
  it("normalizes contact and accepts a secondary contact without requiring it", () => {
    expect(parse().contact.phone).toBe("5511999999999");
    expect(
      parse({
        contact: {
          name: " Ana ",
          preferredChannel: "email",
          email: "ana@example.test",
          phone: "",
        },
      }).contact.name,
    ).toBe("Ana");
  });
  it("rejects missing, excessive or invalid contacts and unknown data", () => {
    for (const name of ["A", "a".repeat(121)])
      expect(() =>
        parse({ contact: { ...requestSubmission.contact, name } }),
      ).toThrow();
    expect(() =>
      parse({
        contact: {
          name: "Ana",
          preferredChannel: "email",
          email: `${"a".repeat(250)}@x.test`,
          phone: "",
        },
      }),
    ).toThrow();
    expect(() =>
      parse({ contact: { ...requestSubmission.contact, phone: "" } }),
    ).toThrow();
    expect(() =>
      parse({
        contact: { ...requestSubmission.contact, phone: "+1234567890123456" },
      }),
    ).toThrow();
    expect(() => parse({ price: "0.01" })).toThrow();
    expect(() => parse({ attemptKey: "SOL-000001" })).toThrow();
  });
  it("enforces line and quantity boundaries and unique identities", () => {
    expect(() => parse({ items: [] })).toThrow();
    expect(() =>
      parse({
        items: Array.from({ length: 21 }, (_, i) => ({
          ...requestSubmission.items[0],
          productId: String(i),
          lineId: String(i),
        })),
      }),
    ).toThrow();
    for (const quantity of [0, 100])
      expect(() =>
        parse({ items: [{ ...requestSubmission.items[0], quantity }] }),
      ).toThrow();
    expect(() =>
      parse({
        items: [requestSubmission.items[0], requestSubmission.items[0]],
      }),
    ).toThrow();
  });
  it("canonicalizes object keys and navigation without merging distinct personalizations", () => {
    const a = parse();
    const b = parse({
      items: [
        {
          ...requestSubmission.items[0],
          catalogContext: {
            search: "gift",
            collection: "",
            order: "nome",
            page: 2,
          },
        },
      ],
    });
    expect(canonicalSubmission(a)).toBe(canonicalSubmission(b));
    expect(canonicalSubmission(a)).toBe(
      canonicalSubmission({
        ...a,
        contact: {
          email: a.contact.email,
          phone: a.contact.phone,
          preferredChannel: a.contact.preferredChannel,
          name: a.contact.name,
        },
      }),
    );
    expect(canonicalSubmission(a)).not.toBe(
      canonicalSubmission(
        parse({ items: [{ ...requestSubmission.items[0], quantity: 2 }] }),
      ),
    );
    const named = (value: string) =>
      parse({
        items: [
          {
            ...requestSubmission.items[0],
            answers: [{ fieldId: "name", value }],
          },
        ],
      });
    expect(canonicalSubmission(named("Ana"))).not.toBe(
      canonicalSubmission(named("Bia")),
    );
  });
  it("allows only specified state changes", () => {
    expect(
      canChangeRequest("RECEBIDA", {
        action: "START",
        expectedVersion: 1,
        assigneeId: "u",
      }),
    ).toBe(true);
    expect(
      canChangeRequest("ENCERRADA", {
        action: "REOPEN",
        expectedVersion: 1,
        assigneeId: "u",
      }),
    ).toBe(true);
    expect(
      canChangeRequest("ORCAMENTO_PREPARADO", {
        action: "REOPEN",
        expectedVersion: 1,
        assigneeId: "u",
      }),
    ).toBe(false);
    expect(
      canChangeRequest("RECEBIDA", {
        action: "REASSIGN",
        expectedVersion: 1,
        assigneeId: "u",
      }),
    ).toBe(false);
  });
});
