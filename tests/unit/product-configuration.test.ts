import { describe, expect, it } from "vitest";
import {
  productConfigurationSchema,
  validateAnswers,
  type ProductConfiguration,
} from "@/domain/products/configuration";
import { configuredPrice } from "@/domain/products/configuration-price";
const definition = (): ProductConfiguration => ({
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
      maxLength: 120,
      effect: { kind: "ADD", amount: "0.20" },
    },
  ],
});
describe("product configuration", () => {
  it("normalizes names without changing inner spaces or case", () => {
    expect(
      validateAnswers(definition(), [
        { fieldId: "name", value: "  Ana  Maria  " },
      ]),
    ).toEqual([{ fieldId: "name", value: "Ana  Maria" }]);
    expect(
      validateAnswers(definition(), [{ fieldId: "name", value: "Jose\u0301" }]),
    ).toEqual([{ fieldId: "name", value: "José" }]);
  });
  it("rejects unknown, repeated and missing required answers", () => {
    for (const answers of [
      [],
      [{ fieldId: "other", value: "Ana" }],
      [{ fieldId: "name", value: " " }],
      [
        { fieldId: "name", value: "Ana" },
        { fieldId: "name", value: "Bia" },
      ],
    ])
      expect(() => validateAnswers(definition(), answers)).toThrow();
  });
  it("counts normalized Unicode points rather than splitting emoji", () => {
    const d = definition();
    d.fields[0] = {
      ...d.fields[0],
      type: "SHORT_TEXT",
      maxLength: 1,
      effect: { kind: "NONE" },
    };
    expect(
      validateAnswers(d, [{ fieldId: "name", value: "😀" }])[0].value,
    ).toBe("😀");
    expect(() =>
      validateAnswers(d, [{ fieldId: "name", value: "😀😀" }]),
    ).toThrow();
  });
  it("enforces field and option boundaries and unique identifiers", () => {
    const d = definition();
    expect(
      productConfigurationSchema.safeParse({
        ...d,
        fields: Array.from({ length: 9 }, (_, i) => ({
          ...d.fields[0],
          id: `f${i}`,
        })),
      }).success,
    ).toBe(false);
    for (const change of [
      { label: "x".repeat(61) },
      { help: "x".repeat(161) },
      { maxLength: 121 },
      { maxLength: 0 },
    ])
      expect(
        productConfigurationSchema.safeParse({
          ...d,
          fields: [{ ...d.fields[0], ...change }],
        }).success,
      ).toBe(false);
    expect(
      productConfigurationSchema.safeParse({
        ...d,
        fields: [d.fields[0], d.fields[0]],
      }).success,
    ).toBe(false);
    const choice = {
      id: "finish",
      label: "Acabamento",
      help: "",
      required: false,
      type: "SINGLE_CHOICE",
      options: Array.from({ length: 21 }, (_, i) => ({
        id: `o${i}`,
        label: `Opção ${i}`,
        effect: { kind: "NONE" },
        imageId: null,
      })),
    };
    expect(
      productConfigurationSchema.safeParse({ ...d, fields: [choice] }).success,
    ).toBe(false);
    expect(
      productConfigurationSchema.safeParse({
        ...d,
        fields: [
          { ...choice, options: [choice.options[0], choice.options[0]] },
        ],
      }).success,
    ).toBe(false);
    expect(
      productConfigurationSchema.safeParse({
        ...d,
        fields: [{ ...d.fields[0], type: "LONG_TEXT", maxLength: 501 }],
      }).success,
    ).toBe(false);
  });
  it("accepts only choices belonging to their field", () => {
    const d = {
      ...definition(),
      fields: [
        {
          id: "finish",
          label: "Acabamento",
          help: "",
          required: false,
          type: "SINGLE_CHOICE" as const,
          options: [
            {
              id: "matte",
              label: "Fosco",
              effect: { kind: "NONE" as const },
              imageId: null,
            },
          ],
        },
      ],
    };
    expect(() =>
      validateAnswers(d, [{ fieldId: "finish", value: "foreign" }]),
    ).toThrow();
    expect(validateAnswers(d, [{ fieldId: "finish", value: "" }])).toEqual([]);
  });
});
describe("configured reference pricing", () => {
  const input = () => ({
    mode: "REFERENCE" as const,
    basePrice: "0.10",
    configuration: definition(),
    answers: [{ fieldId: "name", value: "Ana" }],
    quantity: 3,
  });
  it("adds per-unit amounts with exact decimals", () =>
    expect(configuredPrice(input())).toEqual({
      kind: "REFERENCE",
      unit: "0.30",
      subtotal: "0.90",
    }));
  it("does not charge for empty optional fields", () => {
    const data = input();
    data.configuration.fields[0].required = false;
    data.answers = [];
    expect(configuredPrice(data)).toEqual({
      kind: "REFERENCE",
      unit: "0.10",
      subtotal: "0.30",
    });
  });
  it("returns consultation without invented zero prices", () => {
    const data = input();
    if (data.configuration.fields[0].type !== "SINGLE_CHOICE")
      data.configuration.fields[0].effect = { kind: "CONSULT" };
    expect(configuredPrice(data)).toEqual({
      kind: "CONSULT",
      unit: null,
      subtotal: null,
    });
    expect(
      configuredPrice({ ...input(), mode: "CONSULT", basePrice: null }),
    ).toEqual({ kind: "CONSULT", unit: null, subtotal: null });
  });
  it("rejects invalid quantities and monetary overflow", () => {
    for (const quantity of [0, 100001, 1.5])
      expect(() => configuredPrice({ ...input(), quantity })).toThrow();
    expect(() =>
      configuredPrice({ ...input(), basePrice: "9999999999999999.99" }),
    ).toThrow();
  });
  it("rejects negative, excessive and fractional-cent additions", () => {
    for (const amount of ["-1.00", "0.001", "10000000000000000.00"])
      expect(
        productConfigurationSchema.safeParse({
          ...definition(),
          fields: [
            { ...definition().fields[0], effect: { kind: "ADD", amount } },
          ],
        }).success,
      ).toBe(false);
  });
});
