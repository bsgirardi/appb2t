// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  ProductGalleryEditor,
  type GalleryDraft,
} from "@/components/products/product-gallery-editor";
afterEach(cleanup);
it("reorders and removes photos in the local draft", () => {
  function Harness() {
    const [value, onChange] = useState<GalleryDraft[]>([
      { id: "a", url: "/a" },
      { id: "b", url: "/b" },
    ]);
    return (
      <>
        <ProductGalleryEditor
          value={value}
          onChange={onChange}
          onError={vi.fn()}
        />
        <output>{value.map((v) => v.id).join(",")}</output>
      </>
    );
  }
  render(<Harness />);
  fireEvent.click(
    screen.getByRole("button", { name: "Mover foto 2 para antes" }),
  );
  expect(screen.getByRole("status").textContent).toBe("b,a");
  fireEvent.click(screen.getByRole("button", { name: "Remover foto 1" }));
  expect(screen.getByRole("status").textContent).toBe("a");
});
