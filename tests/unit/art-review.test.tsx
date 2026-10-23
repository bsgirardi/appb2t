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
import {
  ArtDecisionForm,
  PublicArtReview,
} from "@/components/art/public-review";
afterEach(cleanup);
it("loads a different private link opened in the same tab without requiring a manual refresh", async () => {
  window.history.replaceState(null, "", `/portfolio/arte#${"1".repeat(64)}`);
  let number = 1;
  vi.stubGlobal("fetch", async (url: string, options?: RequestInit) => {
    if (url.endsWith("/access")) {
      number = JSON.parse(options!.body as string).token.startsWith("2")
        ? 2
        : 1;
      return new Response(
        JSON.stringify({ data: { revisionId: `r${number}` } }),
      );
    }
    return new Response(
      JSON.stringify({ data: { ...review, id: `r${number}`, number } }),
    );
  });
  try {
    render(<PublicArtReview />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Sua arte, versão 1" }),
      ).toBeTruthy(),
    );
    window.history.replaceState(null, "", `/portfolio/arte#${"2".repeat(64)}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Sua arte, versão 2" }),
      ).toBeTruthy(),
    );
  } finally {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  }
});
const review = {
  id: "r1",
  number: 1,
  state: "AWAITING_CUSTOMER",
  instructions: "Confira Ana",
  manifestHash: "a".repeat(64),
  lines: [
    {
      sourceLineId: "ana",
      name: "Peça Ana",
      quantity: 1,
      color: "Azul",
      size: "P",
      personalizations: [{ label: "Nome", value: "Ana" }],
    },
  ],
  files: [
    {
      id: "f1",
      name: "arte.pdf",
      purpose: "FINAL",
      mimeType: "application/pdf",
      byteLength: 100,
    },
  ],
  decision: null,
};
it("requires explicit review and declared name before approval and displays the persisted result", async () => {
  render(
    <ArtDecisionForm
      review={review}
      onDecide={async () => ({
        action: "APPROVE",
        name: "Ana",
        comment: "",
        decidedAt: "2026-10-23T12:00:00Z",
      })}
    />,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Aprovar esta versão",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Seu nome"), {
    target: { value: "Ana" },
  });
  fireEvent.click(screen.getByLabelText(/Revisei todos os arquivos finais/));
  fireEvent.click(screen.getByRole("button", { name: "Aprovar esta versão" }));
  await waitFor(() =>
    expect(screen.getByText(/Aprovação registrada/)).toBeTruthy(),
  );
  expect(
    screen.queryByRole("button", { name: "Aprovar esta versão" }),
  ).toBeNull();
});
it("keeps the adjustment comment on connection failure and offers a retry", async () => {
  render(
    <ArtDecisionForm
      review={review}
      onDecide={async () => {
        throw new Error("Sem conexão. Tente novamente.");
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Seu nome"), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByLabelText("Ajustes desejados"), {
    target: { value: "Aumentar o nome" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pedir ajustes" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Sem conexão"),
  );
  expect(
    (screen.getByLabelText("Ajustes desejados") as HTMLTextAreaElement).value,
  ).toBe("Aumentar o nome");
});
