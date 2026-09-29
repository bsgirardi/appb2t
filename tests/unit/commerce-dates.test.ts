import { expect, it } from "vitest";
import {
  todaySaoPaulo,
  parseCivilDate,
  addMonthsClamped,
} from "@/domain/commerce/dates";
it("keeps civil dates and São Paulo midnight independent of host timezone", () => {
  expect(todaySaoPaulo(new Date("2026-09-30T02:59:59Z"))).toBe("2026-09-29");
  expect(todaySaoPaulo(new Date("2026-09-30T03:00:00Z"))).toBe("2026-09-30");
  expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
  expect(addMonthsClamped("2028-01-31", 2)).toBe("2028-03-31");
  expect(addMonthsClamped("2027-12-31", 1)).toBe("2028-01-31");
  for (const date of ["2026-02-29", "2026-13-01", "2026-02-30", "26-01-01"])
    expect(() => parseCivilDate(date)).toThrow();
});
