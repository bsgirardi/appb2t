// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createHistoryProtection } from "@/lib/history-protection";

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "navigation");
});
function setup() {
  history.replaceState(
    { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: "list" } },
    "",
    "/orcamentos?search=Ana&page=2",
  );
  const tracker = createHistoryProtection(window);
  dispose = tracker.dispose;
  return tracker;
}
function moveTo(state: unknown, url: string) {
  // Simulate the browser changing its active entry before dispatching popstate.
  const originalReplace = Object.getPrototypeOf(history).replaceState;
  originalReplace.call(history, state, "", url);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}
it("keeps Next state and refuses Back without appending entries", () => {
  const tracker = setup();
  const list = history.state;
  history.pushState(
    { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: "detail" } },
    "",
    "/orcamentos/one",
  );
  const detail = history.state;
  const confirm = vi.fn().mockReturnValue(false);
  tracker.addGuard(confirm);
  const go = vi.spyOn(history, "go").mockImplementation(() => {});
  const push = vi.spyOn(history, "pushState");
  const next = vi.fn();
  window.addEventListener("popstate", next);
  moveTo(list, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
  expect(go).toHaveBeenCalledWith(1);
  expect(next).not.toHaveBeenCalled();
  moveTo(detail, "/orcamentos/one");
  expect(next).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  expect(history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({
    route: "detail",
  });
  window.removeEventListener("popstate", next);
});
it("refuses Forward and restores multi-entry traversals using the correct direction", () => {
  const tracker = setup();
  const first = history.state;
  history.pushState({ __NA: true }, "", "/vendas");
  history.pushState({ __NA: true }, "", "/vendas/two");
  const third = history.state;
  moveTo(first, "/orcamentos?search=Ana&page=2");
  tracker.addGuard(() => false);
  const go = vi.spyOn(history, "go").mockImplementation(() => {});
  moveTo(third, "/vendas/two");
  expect(go).toHaveBeenCalledWith(-2);
});
it("lets accepted traversals reach Next once and removes guards", () => {
  const tracker = setup();
  const first = history.state;
  history.pushState({ __NA: true }, "", "/vendas/one");
  const confirm = vi.fn().mockReturnValue(true);
  const remove = tracker.addGuard(confirm);
  const next = vi.fn();
  window.addEventListener("popstate", next);
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
  expect(next).toHaveBeenCalledOnce();
  remove();
  history.pushState({ __NA: true }, "", "/vendas/two");
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
  expect(next).toHaveBeenCalledTimes(2);
  window.removeEventListener("popstate", next);
});
it("retains the same position on replace and does not mutate caller data", () => {
  setup();
  const first = history.state;
  const data = {
    __NA: true,
    __PRIVATE_NEXTJS_INTERNALS_TREE: { route: "updated" },
  };
  history.replaceState(data, "", "/orcamentos?search=Bruno&page=3");
  expect(history.state.__b2tHistory).toEqual(first.__b2tHistory);
  expect(data).not.toHaveProperty("__b2tHistory");
  expect(history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({
    route: "updated",
  });
});
it("restores real browser-history Back and Forward without changing its length", async () => {
  const tracker = setup();
  history.pushState({ __NA: true }, "", "/orcamentos/one");
  history.pushState({ __NA: true }, "", "/vendas/two");
  const length = history.length;
  const confirm = vi.fn().mockReturnValue(false);
  tracker.addGuard(confirm);
  history.back();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(location.pathname).toBe("/vendas/two"));
  confirm.mockReturnValue(true);
  history.back();
  await vi.waitFor(() => expect(location.pathname).toBe("/orcamentos/one"));
  confirm.mockReturnValue(false);
  confirm.mockClear();
  history.forward();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(location.pathname).toBe("/orcamentos/one"));
  expect(history.length).toBe(length);
});
it("asks once with a non-cancelable Navigation API traversal", () => {
  const navigation = new EventTarget();
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: navigation,
  });
  const tracker = setup();
  const first = history.state;
  history.pushState({ __NA: true }, "", "/vendas/two");
  const confirm = vi.fn().mockReturnValue(false);
  tracker.addGuard(confirm);
  const event = new Event("navigate");
  Object.defineProperty(event, "navigationType", { value: "traverse" });
  navigation.dispatchEvent(event);
  expect(confirm).not.toHaveBeenCalled();
  vi.spyOn(history, "go").mockImplementation(() => {});
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
});
it("does not ask twice when Navigation API already approved the traversal", () => {
  const navigation = new EventTarget();
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: navigation,
  });
  const tracker = setup();
  const first = history.state;
  history.pushState({ __NA: true }, "", "/vendas/two");
  const confirm = vi.fn().mockReturnValue(true);
  tracker.addGuard(confirm);
  const event = new Event("navigate", { cancelable: true });
  Object.defineProperty(event, "navigationType", { value: "traverse" });
  navigation.dispatchEvent(event);
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
});
it("indexes native fragment entries while preserving the Next tree", () => {
  const tracker = setup();
  const first = history.state;
  const tree = { route: "editor" };
  history.pushState(
    { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree },
    "",
    "/orcamentos/one",
  );
  const confirm = vi.fn().mockReturnValue(false);
  tracker.addGuard(confirm);
  moveTo(null, "/orcamentos/one#notes");
  expect(confirm).not.toHaveBeenCalled();
  expect(history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual(tree);
  const go = vi.spyOn(history, "go").mockImplementation(() => {});
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(go).toHaveBeenCalledWith(2);
});
it("does not prompt again while returning to the editor after rapid traversals", () => {
  const tracker = setup();
  const first = history.state;
  history.pushState({ __NA: true }, "", "/orcamentos/one");
  const second = history.state;
  history.pushState({ __NA: true }, "", "/vendas/two");
  const third = history.state;
  const confirm = vi.fn().mockReturnValue(false);
  tracker.addGuard(confirm);
  const go = vi.spyOn(history, "go").mockImplementation(() => {});
  moveTo(second, "/orcamentos/one");
  moveTo(first, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
  expect(go.mock.calls).toEqual([[1], [2]]);
  moveTo(third, "/vendas/two");
  moveTo(second, "/orcamentos/one");
  expect(confirm).toHaveBeenCalledTimes(2);
});
it("does not advance the index for a rejected history write", () => {
  setup();
  const first = history.state;
  expect(() =>
    history.pushState({}, "", "https://other.example.test/"),
  ).toThrow();
  history.pushState({ __NA: true }, "", "/vendas/two");
  expect(history.state.__b2tHistory.index).toBe(first.__b2tHistory.index + 1);
});
it("keeps protecting earlier entries when the editor coordinator is recreated after reload", () => {
  const beforeReload = setup();
  const list = history.state;
  history.pushState({ __NA: true }, "", "/orcamentos/one");
  const editor = history.state;
  beforeReload.dispose();
  const afterReload = createHistoryProtection(window);
  dispose = afterReload.dispose;
  expect(history.state.__b2tHistory).toEqual(editor.__b2tHistory);
  const confirm = vi.fn().mockReturnValue(false);
  afterReload.addGuard(confirm);
  const go = vi.spyOn(history, "go").mockImplementation(() => {});
  moveTo(list, "/orcamentos?search=Ana&page=2");
  expect(confirm).toHaveBeenCalledOnce();
  expect(go).toHaveBeenCalledWith(1);
});
