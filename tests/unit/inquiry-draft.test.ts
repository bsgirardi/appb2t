import { it, expect } from "vitest";
import { mergeInquiryItem, inquiryKey } from "@/domain/products/inquiry";
import {
  migrateInquiryV1,
  parseInquiryDraft,
  replaceInquiryItem,
} from "@/domain/products/inquiry-draft";
const item = (name = "Ana", lineId = "line-a") => ({
  lineId,
  productId: "p",
  color: "",
  size: "",
  quantity: 1,
  answers: [{ fieldId: "name", value: name }],
  commercialRevision: 1,
  seenPrice: null,
  answerLabels: [],
});
it("keeps different names apart and normalizes equivalent keys", () => {
  expect(mergeInquiryItem([item()], item("Bia", "b"))).toHaveLength(2);
  expect(mergeInquiryItem([item()], item())[0].quantity).toBe(2);
  expect(inquiryKey(item("Jose\u0301"))).toBe(inquiryKey(item("José")));
  expect(inquiryKey(item())).not.toBe(
    inquiryKey({ ...item(), commercialRevision: 2 }),
  );
});
it("edits atomically and preserves the destination line when merging", () => {
  const rows = [item(), item("Bia", "b")];
  expect(replaceInquiryItem(rows, "b", item())).toMatchObject([
    { lineId: "line-a", quantity: 2 },
  ]);
  expect(() =>
    replaceInquiryItem(
      [{ ...item(), quantity: 100000 }, item("Bia", "b")],
      "b",
      item(),
    ),
  ).toThrow();
  expect(rows[1].answers[0].value).toBe("Bia");
  expect(() => replaceInquiryItem(rows, "missing", item())).toThrow();
});
it("migrates old drafts without fabricating a confirmed revision", () => {
  expect(
    migrateInquiryV1(
      JSON.stringify([{ productId: "p", quantity: 2 }]),
      () => "a",
    ),
  ).toMatchObject({
    formatVersion: 2,
    items: [
      { lineId: "a", quantity: 2, answers: [], commercialRevision: null },
    ],
  });
  expect(parseInquiryDraft("{broken")).toEqual({
    status: "invalid",
    raw: "{broken",
  });
  expect(
    parseInquiryDraft(JSON.stringify({ formatVersion: 2, items: [] })).status,
  ).toBe("valid");
  expect(parseInquiryDraft("😀".repeat(70000)).status).toBe("invalid");
});
