"use client";
import { useCallback, useEffect, useRef } from "react";

/** Protect browser exits and links without replacing Next's history entries. */
export function useDocumentExit(value: string) {
  const saved = useRef(value);
  const current = useRef(value);
  useEffect(() => {
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
    // Cancel supported history traversals before Next commits them, without
    // rewriting or adding history entries.
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    function navigate(event: Event) {
      if (
        (event as Event & { navigationType?: string }).navigationType !==
          "traverse" ||
        !event.cancelable
      )
        return;
      if (!allowExit()) event.preventDefault();
    }
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
    navigation?.addEventListener("navigate", navigate);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      navigation?.removeEventListener("navigate", navigate);
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
