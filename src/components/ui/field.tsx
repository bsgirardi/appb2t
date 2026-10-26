import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Alert } from "./alert";
import { cn } from "@/lib/utils";
export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="group" data-slot="field-group" className={cn("flex flex-col gap-4", className)} {...props} />;
}
export function Field({
  label,
  hint,
  suffix,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  suffix?: ReactNode;
  error?: string;
}) {
  const generated = useId(),
    id = props.id || generated;
  return (
    <div
      className="field"
      data-slot="field"
      data-invalid={error ? true : undefined}
      data-disabled={props.disabled || undefined}
    >
      <div className="field-heading">
        <Label htmlFor={id}>{label}</Label>
        {props.required && (
          <span className="field-required" aria-hidden="true">
            Obrigatório
          </span>
        )}
      </div>
      <div className="input-wrap">
        <Input
          {...props}
          id={id}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [
              props["aria-describedby"],
              hint ? `${id}-hint` : undefined,
              error ? `${id}-error` : undefined,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <small id={`${id}-error`} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function Notice({
  children,
  kind = "error",
}: {
  children: ReactNode;
  kind?: "error" | "success" | "info";
}) {
  return (
    <Alert
      variant={kind === "error" ? "destructive" : "default"}
      className="my-3 break-words"
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </Alert>
  );
}
