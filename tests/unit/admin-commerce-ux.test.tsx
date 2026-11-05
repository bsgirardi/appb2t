// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QuoteForm } from "@/components/commerce/quote-form";
afterEach(cleanup);
it("cancels supported history traversals without adding history entries", () => {
  const navigation = new EventTarget();
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: navigation,
  });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const push = vi.spyOn(window.history, "pushState");
  const replace = vi.spyOn(window.history, "replaceState");
  const { unmount } = render(
    <QuoteForm
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Frete (R$)"), {
    target: { value: "12" },
  });
  // Initialization may add metadata to the current entry, never an entry.
  replace.mockClear();
  const event = new Event("navigate", { cancelable: true });
  Object.defineProperty(event, "navigationType", { value: "traverse" });
  navigation.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(confirm).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
  unmount();
  confirm.mockClear();
  const afterUnmount = new Event("navigate", { cancelable: true });
  Object.defineProperty(afterUnmount, "navigationType", { value: "traverse" });
  navigation.dispatchEvent(afterUnmount);
  expect(confirm).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "navigation");
});
it("protects cancellation and retains fields after refusing to discard", () => {
  const cancel = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <QuoteForm
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={cancel}
    />,
  );
  fireEvent.change(screen.getByLabelText("Notas internas"), {
    target: { value: "Não perder" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(confirm).toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).toHaveBeenCalledOnce();
  confirm.mockRestore();
});
it("allows incomplete sale drafts while showing the live summary", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(
    <QuoteForm
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
      saveDraft={save}
    />,
  );
  expect(
    screen.getByRole("complementary", { name: "Resumo da tarefa" }).textContent,
  ).toContain("Total");
  expect(screen.getByLabelText("Cliente").hasAttribute("required")).toBe(false);
  fireEvent.submit(document.querySelector("form")!);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
});
it("stops asking after a successful save and protects subsequent edits again", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const cancel = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <QuoteForm
      customers={[]}
      products={[]}
      onSaved={vi.fn()}
      onCancel={cancel}
      saveDraft={save}
    />,
  );
  fireEvent.change(screen.getByLabelText("Frete (R$)"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Salvar rascunho" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Frete (R$)"), {
    target: { value: "34" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).toHaveBeenCalledOnce();
  confirm.mockRestore();
});
