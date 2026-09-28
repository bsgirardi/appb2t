// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { LogoutButton } from "@/components/logout-button";
const navigate = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigate }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("provides account logout independent of sidebar and navigates after revocation", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: true }), { status: 200 }),
  );
  render(<LogoutButton />);
  fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
  await waitFor(() => expect(navigate.replace).toHaveBeenCalledWith("/login"));
  expect(navigate.refresh).toHaveBeenCalled();
});
