// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { TeamArtPanel } from "@/components/art/team-panel";

it("keeps revocation available after the client has approved the revision", async () => {
  vi.stubGlobal(
    "fetch",
    async (url: string) =>
      new Response(
        JSON.stringify({
          data: url.endsWith("/lines")
            ? []
            : [
                {
                  id: "p",
                  currentRevisionId: "r",
                  revisions: [
                    {
                      id: "r",
                      packageId: "p",
                      number: 1,
                      version: 3,
                      state: "APPROVED",
                      instructions: "",
                      manifestHash: "a".repeat(64),
                      lines: [],
                      files: [],
                      decision: {
                        action: "APPROVE",
                        name: "Ana",
                        comment: "",
                        decidedAt: "2026-10-23T12:00:00Z",
                      },
                    },
                  ],
                },
              ],
        }),
      ),
  );
  render(<TeamArtPanel requestId="request" lines={[]} />);
  const details = screen.getByText("Arte e aprovação").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Revogar acesso" })).toBeTruthy(),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads private revisions on opening and preserves draft instructions after a failed creation", async () => {
  vi.stubGlobal("fetch", async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST")
      return new Response(
        JSON.stringify({
          error: { code: "NETWORK", message: "Falha temporária" },
        }),
        { status: 503 },
      );
    return new Response(JSON.stringify({ data: [] }));
  });
  render(
    <TeamArtPanel
      requestId="request"
      lines={[{ lineId: "ana", name: "Peça Ana", quantity: 1 }]}
    />,
  );
  const details = screen.getByText("Arte e aprovação").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() =>
    expect(screen.getByLabelText("Instruções da arte")).toBeTruthy(),
  );
  fireEvent.click(screen.getByLabelText(/Peça Ana/));
  fireEvent.change(screen.getByLabelText("Instruções da arte"), {
    target: { value: "Nome Ana em azul" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar pacote de arte" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Falha temporária"),
  );
  expect(
    (screen.getByLabelText("Instruções da arte") as HTMLTextAreaElement).value,
  ).toBe("Nome Ana em azul");
});
