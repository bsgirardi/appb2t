// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProductPanel } from "@/components/products/product-panel";
import { calculatorData, productDTO } from "../fixtures/product";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("inactivates and reactivates using current version", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { ...productDTO, active: false, version: 2 } }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { ...productDTO, active: true, version: 3 } }),
      ),
    );
  render(
    <ProductPanel
      products={[productDTO]}
      data={calculatorData}
      role="OPERATOR"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Inativar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Reativar" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({
    active: true,
    expectedVersion: 2,
  });
});
