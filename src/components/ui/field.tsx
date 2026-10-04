import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Alert } from "./alert";
export function Field({
  label,
  hint,
  suffix,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  suffix?: ReactNode;
}) {
  const generated = useId(),
    id = props.id || generated;
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <div className="input-wrap">
        <Input
          {...props}
          id={id}
          aria-describedby={
            [props["aria-describedby"], hint ? `${id}-hint` : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
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
