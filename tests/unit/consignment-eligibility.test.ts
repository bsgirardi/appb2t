import { expect, it } from "vitest";
import { isConsignmentProductEligible } from "@/domain/consignment/eligibility";
it("accepts a physically identifiable product but rejects unresolved variants and personalization", () => {
  expect(
    isConsignmentProductEligible({
      configuration: {},
      colors: ["Azul"],
      sizes: [],
    }),
  ).toBe(true);
  expect(
    isConsignmentProductEligible({
      configuration: {},
      colors: ["Azul", "Verde"],
      sizes: [],
    }),
  ).toBe(false);
  expect(
    isConsignmentProductEligible({
      configuration: {},
      colors: [],
      sizes: ["P", "G"],
    }),
  ).toBe(false);
  expect(
    isConsignmentProductEligible({
      configuration: {
        formatVersion: 1,
        included: "",
        leadTimeCondition: "",
        fields: [
          {
            id: "name",
            label: "Nome",
            help: "",
            required: true,
            type: "SHORT_TEXT",
            maxLength: 20,
            effect: { kind: "NONE" },
          },
        ],
      },
      colors: [],
      sizes: [],
    }),
  ).toBe(false);
  expect(
    isConsignmentProductEligible({
      configuration: { fields: "invalid" },
      colors: [],
      sizes: [],
    }),
  ).toBe(false);
});
