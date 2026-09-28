import { useId, type InputHTMLAttributes, type ReactNode } from "react";
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
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          {...props}
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
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
    <div
      className={`notice ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
