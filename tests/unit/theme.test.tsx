// @vitest-environment jsdom
import { expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { themeVariables } from "@/domain/appearance/theme";
import { defaultAppearance } from "@/domain/appearance/validation";
import { contrastRatio } from "@/domain/appearance/colors";
import { CostBreakdown } from "@/components/calculator/cost-breakdown";
import { calculate } from "@/domain/calculation/calculate";
import { calculation } from "../fixtures/product";
import type { CSSProperties } from "react";
afterEach(cleanup);
it("renders costs with readable brand text in either color palette", () => {
  const style = themeVariables({
    ...defaultAppearance,
    logoUrl: null,
    lightPrimary: "#ffffff",
    darkPrimary: "#000000",
  });
  expect(
    contrastRatio(style["--light-primary"], style["--light-on-primary"]),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(style["--dark-primary"], style["--dark-on-primary"]),
  ).toBeGreaterThanOrEqual(4.5);
  render(
    <div style={style as CSSProperties}>
      <CostBreakdown result={calculate(calculation)} markup="200" />
    </div>,
  );
  expect(screen.getByText("Custo total")).toBeTruthy();
  expect(screen.getByText("R$ 48,19")).toBeTruthy();
  expect(screen.getByText(/arredondados/)).toBeTruthy();
});
