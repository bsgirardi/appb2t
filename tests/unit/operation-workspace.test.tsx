// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OperationWorkspace } from "@/components/admin/operation-workspace";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("protects switching actions and cancellation while allowing refresh and internal fields", () => {
  const leave = vi.fn(),
    refresh = vi.fn(),
    add = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <OperationWorkspace>
      <form>
        <input aria-label="Motivo" name="reason" />
        <button type="button" onClick={add}>
          Adicionar linha
        </button>
        <button type="button" data-leave-operation onClick={leave}>
          Voltar
        </button>
      </form>
      <button onClick={leave}>Outra ação</button>
      <button data-preserve-draft onClick={refresh}>
        Atualizar
      </button>
    </OperationWorkspace>,
  );
  fireEvent.change(screen.getByLabelText("Motivo"), {
    target: { value: "Conferência" },
  });
  fireEvent.click(screen.getByText("Outra ação"));
  fireEvent.click(screen.getByText("Voltar"));
  expect(leave).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByText("Adicionar linha"));
  fireEvent.click(screen.getByText("Atualizar"));
  expect(add).toHaveBeenCalledOnce();
  expect(refresh).toHaveBeenCalledOnce();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText("Outra ação"));
  expect(leave).toHaveBeenCalledOnce();
});
it("clears protection after a confirmed save", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false),
    leave = vi.fn();
  render(
    <OperationWorkspace>
      <form>
        <input name="reason" aria-label="Motivo" />
      </form>
      <button onClick={leave}>Outra ação</button>
    </OperationWorkspace>,
  );
  fireEvent.change(screen.getByLabelText("Motivo"), {
    target: { value: "Teste" },
  });
  screen
    .getByLabelText("Motivo")
    .closest("form")!
    .dispatchEvent(new Event("operation-saved", { bubbles: true }));
  fireEvent.click(screen.getByText("Outra ação"));
  expect(leave).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});
it("keeps another form protected when one operation succeeds", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false),
    leave = vi.fn();
  render(
    <OperationWorkspace>
      <form>
        <input name="a" aria-label="Separação" />
      </form>
      <form>
        <input name="b" aria-label="Entrega" />
      </form>
      <button onClick={leave}>Sair</button>
    </OperationWorkspace>,
  );
  fireEvent.change(screen.getByLabelText("Separação"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("Entrega"), {
    target: { value: "1" },
  });
  screen
    .getByLabelText("Entrega")
    .closest("form")!
    .dispatchEvent(new Event("operation-saved", { bubbles: true }));
  fireEvent.click(screen.getByText("Sair"));
  expect(confirm).toHaveBeenCalledOnce();
  expect(leave).not.toHaveBeenCalled();
});
it("protects structural edits and keeps protection when an accepted action retains the form", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  render(
    <OperationWorkspace>
      <form>
        <button type="button" data-draft-change>
          Remover item
        </button>
      </form>
      <button>Consultar</button>
    </OperationWorkspace>,
  );
  fireEvent.click(screen.getByText("Remover item"));
  fireEvent.click(screen.getByText("Consultar"));
  expect(confirm).toHaveBeenCalledOnce();
  confirm.mockReturnValue(false);
  fireEvent.click(screen.getByText("Consultar"));
  expect(confirm).toHaveBeenCalledTimes(2);
});
