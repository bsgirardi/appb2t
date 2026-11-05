"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { startHistoryProtection } from "@/lib/history-protection";

/** Protect browser exits and links without replacing Next's history entries. */
export function useDocumentExit(value: string) {
  const saved = useRef(value);
  const current = useRef(value);
  useLayoutEffect(() => {
    current.current = value;
  }, [value]);
  const dirty = useCallback(() => current.current !== saved.current, []);
  const allowExit = useCallback(() => {
    return (
      !dirty() ||
      window.confirm(
        "Há alterações não salvas. Deseja descartar as alterações?",
      )
    );
  }, [dirty]);
  useEffect(() => {
    const removeGuard = startHistoryProtection().addGuard(allowExit);
    function unload(event: BeforeUnloadEvent) {
      if (!dirty()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function click(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!link || link.download || (link.target && link.target !== "_self"))
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.pathname === location.pathname &&
        destination.search === location.search
      )
        return;
      if (!allowExit()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      removeGuard();
      document.removeEventListener("click", click, true);
    };
  }, [allowExit, dirty]);
  return {
    allowExit,
    markSaved: () => {
      saved.current = current.current;
    },
  };
}
