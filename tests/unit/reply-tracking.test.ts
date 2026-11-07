import { expect, it } from "vitest";
import {
  replyWaitingSince,
  commercialSettingsSchema,
  defaultCommercialSettings,
} from "@/domain/opportunities/reply-tracking";
const event = (type: string, day: string, extra = {}) => ({
  id: day + type,
  type,
  createdAt: `2026-10-${day}T15:00:00Z`,
  data: { quoteId: "q", quoteVersion: 2, ...extra },
});
it("defaults to fourteen and accepts only bounded whole-day admin settings", () => {
  expect(defaultCommercialSettings.replyWaitDays).toBe(14);
  for (const replyWaitDays of [0, -1, 1.5, 366, NaN])
    expect(
      commercialSettingsSchema.safeParse({ replyWaitDays, expectedVersion: 0 })
        .success,
    ).toBe(false);
  expect(
    commercialSettingsSchema.parse({ replyWaitDays: 30, expectedVersion: 0 })
      .replyWaitDays,
  ).toBe(30);
});
it("only explicit sent starts a wait; notes and reminders do not reset first unanswered sent", () => {
  expect(replyWaitingSince([event("INTERACTION", "01")], "q", 2)).toBeNull();
  expect(
    replyWaitingSince(
      [
        event("PROPOSAL_SENT", "01"),
        event("INTERACTION", "03"),
        event("PROPOSAL_SENT", "04"),
      ],
      "q",
      2,
    ),
  ).toBe("2026-10-01");
});
it("reply closes cycle; new send opens another; ignores other quote revisions", () => {
  const rows = [event("PROPOSAL_SENT", "01"), event("CUSTOMER_REPLY", "02")];
  expect(replyWaitingSince(rows, "q", 2)).toBeNull();
  expect(
    replyWaitingSince([...rows, event("PROPOSAL_SENT", "05")], "q", 2),
  ).toBe("2026-10-05");
  expect(replyWaitingSince(rows.slice(0, 1), "q", 3)).toBeNull();
  expect(replyWaitingSince(rows.slice(0, 1), "other", 2)).toBeNull();
});
it("primary change and reopening invalidate older cycles; uses São Paulo civil day", () => {
  for (const type of ["SET_PRIMARY", "REOPEN"])
    expect(
      replyWaitingSince(
        [
          event("PROPOSAL_SENT", "01"),
          event(type, "02", {
            before: { principalQuoteId: "other" },
            after: { principalQuoteId: "q" },
          }),
        ],
        "q",
        2,
      ),
    ).toBeNull();
  expect(
    replyWaitingSince(
      [{ ...event("PROPOSAL_SENT", "01"), createdAt: "2026-10-02T01:00:00Z" }],
      "q",
      2,
    ),
  ).toBe("2026-10-01");
});

it("requires explicit quote and revision for sent/reply without changing old notes", async () => {
  const { opportunityCommandSchema } =
    await import("@/domain/opportunities/validation");
  for (const action of ["PROPOSAL_SENT", "CUSTOMER_REPLY"]) {
    expect(
      opportunityCommandSchema.safeParse({
        action,
        operationKey: "12345678",
        expectedVersion: 1,
        text: "Contato",
      }).success,
    ).toBe(false);
    expect(
      opportunityCommandSchema.safeParse({
        action,
        operationKey: "12345678",
        expectedVersion: 1,
        text: "Contato",
        quoteId: "q",
        quoteVersion: 2,
      }).success,
    ).toBe(true);
  }
});
