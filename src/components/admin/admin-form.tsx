"use client";
import type { ComponentProps } from "react";
import { revealAndFocusInvalid } from "./form-errors";

/** Keeps native submission and domain validation in the owning form. */
export function AdminForm({
  children,
  onInvalidCapture,
  onSubmitCapture,
  requiredGuide = true,
  ...props
}: ComponentProps<"form"> & { requiredGuide?: boolean }) {
  return (
    <form
      {...props}
      onInvalidCapture={(event) => {
        onInvalidCapture?.(event);
        // Reveal hidden native-required controls before the browser tries to focus them.
        revealAndFocusInvalid(event.currentTarget);
      }}
      onSubmitCapture={(event) => {
        onSubmitCapture?.(event);
        const form = event.currentTarget;
        requestAnimationFrame(() => {
          if (form.isConnected) revealAndFocusInvalid(form);
        });
      }}
    >
      {requiredGuide && (
        <p className="admin-form-note admin-required-guide">
          Campos com “Obrigatório” precisam ser preenchidos para esta operação.
        </p>
      )}
      {children}
    </form>
  );
}
