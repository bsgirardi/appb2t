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
