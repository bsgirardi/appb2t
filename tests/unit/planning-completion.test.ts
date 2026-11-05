import { it, expect } from "vitest";
import { projectCompletion } from "@/domain/planning/completion";
const at = "2026-11-04T12:00:00Z";
it("does not invent delivery from machine minutes or unknown post-production", () => {
  expect(
    projectCompletion(at, false, {
      post: { mode: "unknown" },
      delivery: { mode: "unknown" },
    }).deliveryAt,
  ).toBeNull();
});
it("validates release and delivery precedence and requires reasons", () => {
  expect(() =>
    projectCompletion(at, false, {
      post: {
        mode: "declared",
        at: "2026-11-03T12:00:00Z",
        reason: "Conferido",
      },
      delivery: { mode: "unknown" },
    }),
  ).toThrow();
  expect(() =>
    projectCompletion(at, false, {
      post: { mode: "waived", reason: "" },
      delivery: { mode: "unknown" },
    }),
  ).toThrow();
  expect(() =>
    projectCompletion(at, false, {
      post: { mode: "waived", reason: "Dispensado" },
      delivery: {
        mode: "pickup",
        at: "2026-11-03T12:00:00Z",
        reason: "Atendimento",
      },
    }),
  ).toThrow();
});
it("permits declared pickup or shipping after explicit release", () => {
  expect(
    projectCompletion(at, false, {
      post: { mode: "waived", reason: "Sem acabamento" },
      delivery: { mode: "pickup", at, reason: "Atendimento confirmado" },
    }).deliveryAt,
  ).toBe(at);
  expect(
    projectCompletion(null, false, {
      post: { mode: "waived", reason: "Sem acabamento" },
      delivery: {
        mode: "shipping",
        at,
        source: "Transportadora",
        reason: "Cotação",
      },
    }).deliveryAt,
  ).toBeNull();
});
