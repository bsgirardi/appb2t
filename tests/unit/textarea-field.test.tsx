// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TextareaField } from "@/components/ui/field";
afterEach(cleanup);
it("connects its label, hint and validation error and preserves disabled semantics", () => {
  render(
    <TextareaField
      label="Texto do anúncio"
      hint="Até 5000"
      error="Confira o texto"
      disabled
      required
    />,
  );
  const input = screen.getByRole("textbox", {
    name: /Texto do anúncio/,
  }) as HTMLTextAreaElement;
  expect(input.tagName).toBe("TEXTAREA");
  expect(input.disabled).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(
    input
      .getAttribute("aria-describedby")!
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" "),
  ).toContain("Confira o texto");
});
