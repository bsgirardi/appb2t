// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RequestSubmit } from "@/components/products/request-submit";
import { api, ApiError } from "@/lib/client-api";
import {
  discardRequestAttempt,
  readRequestAttempt,
} from "@/lib/catalog-request-attempt";
import { parseCatalogSubmission } from "@/domain/catalog-requests/validation";
import { requestSubmission } from "../fixtures/catalog-request";
vi.mock("@/lib/client-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
beforeEach(() => {
  discardRequestAttempt();
  vi.clearAllMocks();
});
afterEach(cleanup);
const items = parseCatalogSubmission(requestSubmission).items;
const review = {
  lines: [],
  total: "10.00",
  ready: true,
  message: "",
  contact: null,
  channel: null,
};
const receipt = {
  protocol: "SOL-000001",
  acceptedAt: "2026-10-20T12:00:00Z",
  received: true,
};
function fill() {
  fireEvent.change(screen.getByLabelText("Seu nome"), {
    target: { value: "Ana Silva" },
  });
  fireEvent.change(screen.getByLabelText("Seu WhatsApp"), {
    target: { value: "11999999999" },
  });
}
it("focuses the first contact error and requires a valid review", () => {
  const view = render(
    <RequestSubmit items={items} review={review} onClearSubmitted={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Seu nome"));
  expect(screen.getByLabelText("Seu nome").getAttribute("aria-invalid")).toBe(
    "true",
  );
  view.rerender(
    <RequestSubmit
      items={items}
      review={{ ...review, ready: false }}
      onClearSubmitted={vi.fn()}
    />,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Enviar solicitação",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
it("retains the attempt on timeout and recovers the server receipt without submitting twice", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({ ready: true })
    .mockRejectedValueOnce(new ApiError("timeout", "NETWORK"))
    .mockResolvedValueOnce(receipt);
  const clear = vi.fn();
  render(
    <RequestSubmit items={items} review={review} onClearSubmitted={clear} />,
  );
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
  await screen.findByText(/Ainda não foi possível confirmar/);
  const pending = readRequestAttempt();
  expect(pending?.kind).toBe("pending");
  expect(clear).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Verificar recebimento" }),
  );
  await screen.findByText("SOL-000001");
  expect(
    vi.mocked(api).mock.calls.filter((c) => c[0] === "/api/portfolio/requests"),
  ).toHaveLength(1);
  expect(sessionStorage.getItem("b2t:request:attempt:v1")).not.toContain(
    "Ana Silva",
  );
  expect(clear).not.toHaveBeenCalled();
});
it("retries with the same key and payload and cleans only after explicit action", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new ApiError("timeout", "NETWORK"))
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce(receipt);
  const clear = vi.fn();
  render(
    <RequestSubmit items={items} review={review} onClearSubmitted={clear} />,
  );
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
  await screen.findByText(/Ainda não foi possível confirmar/);
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByText("SOL-000001");
  const sends = vi
    .mocked(api)
    .mock.calls.filter((c) => c[0] === "/api/portfolio/requests");
  expect(sends[0][1]).toEqual(sends[1][1]);
  fireEvent.click(
    screen.getByRole("button", { name: "Limpar seleção enviada" }),
  );
  await waitFor(() => expect(clear).toHaveBeenCalledWith(items));
});
it("explains rate limiting without discarding the recoverable attempt", async () => {
  vi.mocked(api)
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(
      new ApiError(
        "Muitas tentativas. Aguarde e tente novamente.",
        "RATE_LIMIT",
      ),
    );
  render(
    <RequestSubmit items={items} review={review} onClearSubmitted={vi.fn()} />,
  );
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
  await screen.findByText(/Muitas tentativas. Aguarde/);
  expect(readRequestAttempt()?.kind).toBe("pending");
});
