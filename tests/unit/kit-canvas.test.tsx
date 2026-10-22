// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KitCanvas } from "@/components/kits/kit-canvas";
afterEach(cleanup);
it("one_photo_per_line_even_at_99", () => {
  const lines = Array.from({ length: 20 }, (_, i) => ({
    lineId: `l${i}`,
    name: `Peça ${i}`,
    quantity: 99,
    imageUrl: `/photo${i}.webp`,
  }));
  render(
    <KitCanvas
      lines={lines}
      placements={lines.map((l, z) => ({
        lineId: l.lineId,
        x: 0.5,
        y: 0.5,
        z,
      }))}
      onMove={() => {}}
    />,
  );
  expect(screen.getAllByRole("img")).toHaveLength(20);
  expect(screen.getAllByText("99 un.")).toHaveLength(20);
});
it("keyboard_can_replace_drag_and_stays_in_bounds", () => {
  function Canvas() {
    const [positions, setPositions] = useState([
      { lineId: "l", x: 0, y: 0.5, z: 0 },
    ]);
    return (
      <>
        <KitCanvas
          lines={[
            { lineId: "l", name: "Peça", quantity: 5, imageUrl: "/p.webp" },
          ]}
          placements={positions}
          onMove={(lineId, x, y) => setPositions([{ lineId, x, y, z: 0 }])}
        />
        <output>{JSON.stringify(positions)}</output>
      </>
    );
  }
  const view = render(<Canvas />),
    button = screen.getByRole("button", { name: "Mover Peça, 5 unidades" });
  fireEvent.keyDown(button, { key: "ArrowLeft" });
  expect(
    JSON.parse(view.container.querySelector("output")!.textContent!)[0].x,
  ).toBe(0);
  fireEvent.keyDown(button, { key: "ArrowRight" });
  expect(
    JSON.parse(view.container.querySelector("output")!.textContent!)[0].x,
  ).toBe(0.02);
});
