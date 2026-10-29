// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ContextEditor } from "@/components/admin/context-editor";
import { TaskLayout } from "@/components/admin/task-layout";
afterEach(cleanup);
it("shows the task and its contextual summary together", () => {
  render(
    <TaskLayout summary={<p>Total R$ 100</p>}>
      <p>Itens da venda</p>
    </TaskLayout>,
  );
  expect(
    screen.getByRole("complementary", { name: "Resumo da tarefa" }).textContent,
  ).toContain("Total R$ 100");
  expect(screen.getByText("Itens da venda")).toBeTruthy();
});
it("keeps unsaved edits until explicit discard in the same panel", () => {
  function Example() {
    const [open, setOpen] = useState(true);
    return (
      <ContextEditor
        open={open}
        onOpenChange={setOpen}
        title="Editar cliente"
        dirty
      >
        <input aria-label="Nome" defaultValue="Ana" />
      </ContextEditor>
    );
  }
  render(<Example />);
  expect(screen.getByRole("dialog").getAttribute("data-slot")).toBe(
    "dialog-content",
  );
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  expect(screen.getByRole("dialog", { name: "Editar cliente" })).toBeTruthy();
  expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Ana");
  fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar alterações" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("starts a clean editing session after a programmatic save closes it", () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir cliente</button>
        <ContextEditor open={open} onOpenChange={setOpen} title="Cliente">
          <input aria-label="Nome" />
          <button onClick={() => setOpen(false)}>Simular salvamento</button>
        </ContextEditor>
      </>
    );
  }
  render(<Example />);
  fireEvent.click(screen.getByText("Abrir cliente"));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
  fireEvent.click(screen.getByText("Simular salvamento"));
  fireEvent.click(screen.getByText("Abrir cliente"));
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
