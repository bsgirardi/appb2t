import { describe, it, expect } from "vitest";
import { batchIssues, forecastIssues } from "@/domain/planning/issues";
import { scenarioInput } from "../fixtures/planning-scenario";
import { forecast } from "@/domain/planning/scheduler";

describe("actionable planning issues", () => {
  it("keeps each affected line and explains every existing predicate", () => {
    const result = batchIssues([
      ...[
        "MACHINE_INACTIVE",
        "MATERIAL_INACTIVE",
        "COLOR",
        "DURATION",
        "PROFILE_FIT",
        "STOCK",
      ].map((code) => ({ code, kind: "batch", id: "b" })),
      ...["ORDER_MACHINE", "RESERVATION", "COVERAGE_CHANGED"].flatMap((code) =>
        ["l1", "l2"].map((id) => ({ code, kind: "line", id })),
      ),
      { code: "RESERVATION", kind: "line", id: "l1" },
    ]);
    expect(result).toHaveLength(12);
    expect(
      result.filter((x) => x.code === "RESERVATION").map((x) => x.entity.id),
    ).toEqual(["l1", "l2"]);
    for (const issue of result) {
      expect(issue.message).not.toBe("");
      expect(issue.nextAction).not.toBe("");
      expect(issue.resolution).not.toBe("");
    }
  });
  it("points missing calendars to the right resource without inventing a causal batch", () => {
    const input = scenarioInput();
    input.team = null;
    input.machines[0].calendar = null;
    const issues = forecastIssues(input, forecast(input));
    expect(issues.some((x) => x.entity.id === "TEAM")).toBe(true);
    expect(issues.some((x) => x.entity.id === "PRINTER:p")).toBe(true);
    expect(
      issues
        .filter((x) => x.code === "MISSING_DATA")
        .every((x) => !x.message.includes("causado pelo lote")),
    ).toBe(true);
  });
  it("explains horizon and unconfirmed service endings", () => {
    const input = scenarioInput();
    const out = forecast(input);
    out.batches[0].reason = "NO_WINDOW";
    out.batches[1].reason = "UNCONFIRMED_END";
    const issues = forecastIssues(input, out);
    expect(issues.find((x) => x.code === "NO_WINDOW")?.resolution).toContain(
      "90",
    );
    expect(
      issues.find((x) => x.code === "UNCONFIRMED_END")?.nextAction,
    ).toContain("marcos");
  });
});
