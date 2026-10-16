import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Native form semantics are intentional: required, FormData and fieldset disabled.
export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-base transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
export function NativeSelectOption(props: ComponentProps<"option">) {
  return <option {...props} />;
}
export function NativeSelectOptGroup(props: ComponentProps<"optgroup">) {
  return <optgroup {...props} />;
}
