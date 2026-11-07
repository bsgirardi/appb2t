// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CommercialSettingsPanel } from "@/components/settings/commercial-settings-panel";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("shows default 14 and saves configured whole days with version", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data: { replyWaitDays: 21, version: 1 } }),
        { status: 200 },
      ),
    );
  render(
    <CommercialSettingsPanel initial={{ replyWaitDays: 14, version: 0 }} />,
  );
  const input = screen.getByLabelText("Prazo sem retorno (dias corridos)");
  expect((input as HTMLInputElement).value).toBe("14");
  fireEvent.change(input, { target: { value: "21" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Salvar prazo comercial" }),
  );
  await screen.findByText(/Prazo comercial salvo/);
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
    replyWaitDays: 21,
    expectedVersion: 0,
  });
});
