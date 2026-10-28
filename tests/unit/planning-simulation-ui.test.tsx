// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Queue } from "@/components/planning/queue";
import type { PlanningData } from "@/components/planning/shared";
import type { QueuePreview } from "@/domain/planning/scenario";
import { simulateQueue } from "@/domain/planning/scenario";
import { scenarioInput } from "../fixtures/planning-scenario";
const { api, command } = vi.hoisted(() => ({ api: vi.fn(), command: vi.fn() }));
vi.mock("@/lib/client-api", () => ({ api }));
vi.mock("@/lib/planning-client", () => ({ planningCommand: command }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
function fixture() {
  const input = scenarioInput();
  const data = { asOf: input.asOf, revision: input.revision, batches: input.machines.flatMap(m => m.batches),
    printers: [{ id: "p", name: "Máquina A" }, { id: "q", name: "Máquina B" }], forecast: simulateQueue(input, { printerId: "p", batchIds: ["a", "b"] }).before } as unknown as PlanningData;
  const preview: QueuePreview = { ...simulateQueue(input, { printerId: "p", batchIds: ["b", "a"] }),
    asOf: input.asOf, revision: 4, expiresAt: "2026-10-27T11:01:00Z", fingerprint: "f".repeat(64) };
  return { data, preview };
}
it("previews hidden-machine impacts, refreshes for explicit confirmation, then applies the reviewed payload", async () => {
  const { data, preview } = fixture(); api.mockResolvedValue(preview); command.mockResolvedValue({ revision: 5 });
  const done = vi.fn();
  render(<Queue data={data} batches={data.batches.filter(b => b.printerId === "p")} onSelect={() => {}} onDone={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  await screen.findByRole("heading", { name: "Simulação da fila" });
  expect(command).not.toHaveBeenCalled();
  expect(screen.getByText(/OP 99/)).toBeTruthy();
  expect(screen.getByText("Máquina B")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Revisar para confirmar" }));
  await screen.findByRole("button", { name: "Confirmar nova ordem" });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar nova ordem" }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(command).toHaveBeenCalledWith("QUEUE_REORDER", expect.objectContaining({ printerId: "p", batchIds: ["b", "a"], previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint, expectedRevision: 4 }));
});
it("cancels without writing and ignores a response from a canceled request", async () => {
  const { data, preview } = fixture();
  let resolve!: (v: QueuePreview) => void;
  api.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue(preview);
  render(<Queue data={data} batches={data.batches} onSelect={() => {}} onDone={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  fireEvent.click(await screen.findByRole("button", { name: "Descartar simulação" }));
  await act(async () => { resolve(preview); });
  expect(screen.queryByRole("heading", { name: "Simulação da fila" })).toBeNull();
  expect(command).not.toHaveBeenCalled();
});
it("requires a fresh simulation after expiry or focus after suspension", async () => {
  vi.useFakeTimers(); const { data, preview } = fixture(); api.mockResolvedValue(preview);
  render(<Queue data={data} batches={data.batches} onSelect={() => {}} onDone={() => {}} />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Revisar para confirmar" })); });
  expect(screen.getByRole("button", { name: "Confirmar nova ordem" }).hasAttribute("disabled")).toBe(false);
  act(() => { vi.setSystemTime(Date.now() + 60001); window.dispatchEvent(new Event("focus")); });
  expect(screen.getByRole("button", { name: "Confirmar nova ordem" }).hasAttribute("disabled")).toBe(true);
  expect(command).not.toHaveBeenCalled();
});
it("labels unavailable forecasts separately from deadline compliance", async () => {
  const { data, preview } = fixture();
  preview.impacts[0].after.removal = null; preview.impacts[0].after.late = false; preview.impacts[0].after.reason = "MISSING_DATA";
  api.mockResolvedValue(preview);
  render(<Queue data={data} batches={data.batches} onSelect={() => {}} onDone={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  expect(await screen.findByText(/Previsão indisponível: configure/)).toBeTruthy();
});
it("replays the same confirmation after losing the committed response body", async () => {
  const { data, preview } = fixture(); api.mockResolvedValue(preview);
  command.mockRejectedValueOnce(new TypeError("Connection lost while reading response")).mockResolvedValueOnce({ revision: 5 });
  render(<Queue data={data} batches={data.batches} onSelect={() => {}} onDone={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  await screen.findByRole("heading", { name: "Simulação da fila" });
  fireEvent.click(screen.getByRole("button", { name: "Revisar para confirmar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar nova ordem" }));
  fireEvent.click(await screen.findByRole("button", { name: "Repetir confirmação" }));
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command.mock.calls[1]).toEqual(command.mock.calls[0]);
});
it("accumulates successive moves in the staged queue before any write", async () => {
  const { data, preview } = fixture(); api.mockResolvedValue(preview);
  data.batches.push({ ...data.batches[0], id: "d", sequence: 100, position: 3 });
  render(<Queue data={data} batches={data.batches} onSelect={() => {}} onDone={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  await screen.findByRole("heading", { name: "Simulação da fila" });
  fireEvent.click(screen.getByRole("button", { name: "Descer lote 97" }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  expect(api.mock.calls[1][1]).toEqual({ printerId: "p", batchIds: ["b", "d", "a"] });
  expect(command).not.toHaveBeenCalled();
});
