// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductCarousel } from "@/components/products/product-carousel";
afterEach(cleanup);
const images = [
  { id: "a", url: "/a.webp", position: 0 },
  { id: "b", url: "/b.webp", position: 1 },
];
it("navigates photos with buttons, keyboard and swipe", () => {
  render(<ProductCarousel name="Vaso" images={images} />);
  fireEvent.click(screen.getByRole("button", { name: "Próxima foto" }));
  expect(screen.getByRole("img").getAttribute("src")).toBe("/b.webp");
  fireEvent.click(screen.getByRole("button", { name: "Próxima foto" }));
  expect(screen.getByRole("img").getAttribute("src")).toBe("/a.webp");
  const gallery = screen.getByRole("region");
  fireEvent.keyDown(gallery, { key: "ArrowRight" });
  expect(screen.getByRole("img").getAttribute("src")).toBe("/b.webp");
  fireEvent.touchStart(gallery, { touches: [{ clientX: 200, clientY: 30 }] });
  fireEvent.touchEnd(gallery, {
    changedTouches: [{ clientX: 60, clientY: 35 }],
  });
  expect(screen.getByRole("img").getAttribute("src")).toBe("/a.webp");
});
it("does not show controls for one photo", () => {
  render(<ProductCarousel name="Vaso" images={images.slice(0, 1)} />);
  expect(screen.queryByRole("button")).toBeNull();
});
it("selects an individual photograph and exposes the active thumbnail", () => {
  render(<ProductCarousel name="Vaso" images={images} />);
  const second = screen.getByRole("button", { name: "Ver foto 2 de Vaso" });
  fireEvent.click(second);
  expect(screen.getByRole("img").getAttribute("src")).toBe("/b.webp");
  expect(second.getAttribute("aria-pressed")).toBe("true");
  expect(
    screen
      .getByRole("button", { name: "Ver foto 1 de Vaso" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
});
