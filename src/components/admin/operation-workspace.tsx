"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDocumentExit } from "@/components/commerce/use-document-exit";

/** Presentation-only guard; never submits, resets or modifies an operation. */
export function OperationWorkspace({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const changed = useRef(new Set<HTMLFormElement>());
  const [revision, setRevision] = useState(0);
  const { allowExit, markSaved } = useDocumentExit(String(revision));
  const save = useRef(markSaved);
  useLayoutEffect(() => {
    save.current = markSaved;
  }, [markSaved]);
  useEffect(() => {
    const node = root.current!;
    const clear = (event: Event) => {
      if (event.target instanceof HTMLFormElement)
        changed.current.delete(event.target);
      if (!changed.current.size) save.current();
    };
    node.addEventListener("operation-saved", clear);
    const observer = new MutationObserver(() => {
      for (const form of changed.current)
        if (!node.contains(form)) changed.current.delete(form);
      if (!changed.current.size) save.current();
    });
    observer.observe(node, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("operation-saved", clear);
    };
  }, []);
  return (
    <div
      ref={root}
      className="flex min-w-0 flex-col gap-5"
      onChangeCapture={(event) => {
        const form = (event.target as HTMLElement).closest("form");
        if (form) {
          changed.current.add(form);
          setRevision((value) => value + 1);
        }
      }}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        const button = target.closest("button");
        if (!button || button.hasAttribute("data-preserve-draft")) return;
        if (button.hasAttribute("data-draft-change")) {
          const form = button.closest("form");
          if (form) {
            changed.current.add(form);
            setRevision((value) => value + 1);
          }
          return;
        }
        // Adding/removing lines and submitting inside the current form keep the draft.
        if (
          button.closest("form") &&
          !button.hasAttribute("data-leave-operation")
        )
          return;
        if (!allowExit()) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
