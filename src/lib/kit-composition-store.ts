"use client";
import {
  createKitHistory,
  kitHistoryReducer,
  type KitHistoryAction,
} from "@/domain/kits/draft";
import type { KitSelection } from "@/domain/kits/types";
import { readKitDraft, writeKitSelection } from "./inquiry-store";
export function createKitCompositionStore() {
  let history = createKitHistory(readKitDraft().selection);
  const listeners = new Set<() => void>();
  function dispatch(action: KitHistoryAction) {
    const current = readKitDraft();
    const changedExternally =
      JSON.stringify(current.selection) !== JSON.stringify(history.present);
    if (changedExternally) history = createKitHistory(current.selection);
    const next = kitHistoryReducer(history, action);
    if (next !== history) {
      writeKitSelection(next.present, current.revision);
      history = next;
      listeners.forEach((listener) => listener());
    } else if (changedExternally) listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => history,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    commit: (selection: KitSelection) =>
      dispatch({ type: "commit", selection }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
  };
}
