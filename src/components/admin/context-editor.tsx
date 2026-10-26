"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useAdminTheme } from "./admin-theme";

export function ContextEditor({
  open,
  onOpenChange,
  title,
  description,
  dirty = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  dirty?: boolean;
  children: ReactNode;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const theme = useAdminTheme();
  const [changed, setChanged] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (!open) {
      setChanged(false);
      setConfirmDiscard(false);
    }
  }
  const returnFocus = useRef<HTMLElement | null>(null);
  function close(next: boolean) {
    if (!next && (dirty || changed)) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    setChanged(false);
    onOpenChange(next);
  }
  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        className="admin-ui admin-theme font-admin admin-context-editor w-full sm:max-w-[640px]"
        style={theme}
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {description ??
            "Edite sem sair da lista. As alterações são aplicadas ao salvar."}
        </SheetDescription>
        {confirmDiscard && (
          <Alert role="alert">
            <p>Há alterações não salvas.</p>
            <div className="admin-discard-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDiscard(false)}
              >
                Continuar editando
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setConfirmDiscard(false);
                  setChanged(false);
                  onOpenChange(false);
                }}
              >
                Descartar alterações
              </Button>
            </div>
          </Alert>
        )}
        <div
          onChangeCapture={() => setChanged(true)}
          onClickCapture={(event) => {
            const target = event.target as HTMLElement;
            if (
              target.closest("button[data-cancel-editor]") &&
              (dirty || changed)
            ) {
              event.preventDefault();
              event.stopPropagation();
              setConfirmDiscard(true);
            }
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
