// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SettingsPanel } from "@/components/settings/settings-panel";
afterEach(cleanup);
it("names create actions by the selected resource", () => {
  render(
    <SettingsPanel
      initialData={{ materials: [], printers: [], users: [], settings: null }}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Adicionar material" }),
  ).toBeTruthy();
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Impressoras/ }), {
    button: 0,
    ctrlKey: false,
  });
  expect(
    screen.getByRole("button", { name: "Adicionar impressora" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Adicionar impressora" }));
  expect(screen.getByRole("dialog", { name: /Impressoras/ })).toBeTruthy();
});
it("asks before the editor header discards unsaved configuration", () => {
  render(
    <SettingsPanel
      initialData={{ materials: [], printers: [], users: [], settings: null }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Adicionar material" }));
  expect(
    screen.getAllByRole("heading", { name: "Adicionar · Materiais" }),
  ).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "PLA" } });
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  expect(
    screen.getByRole("button", { name: "Continuar editando" }),
  ).toBeTruthy();
  expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("PLA");
});
