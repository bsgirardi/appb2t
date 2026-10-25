"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => {
  const parts = React.Children.toArray(children);
  const requiredIndex = parts.findIndex(
    (child) =>
      React.isValidElement<{ required?: boolean }>(child) &&
      child.props.required,
  );
  const required = requiredIndex > 0;
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      data-required-label={required || undefined}
      {...props}
    >
      {required ? (
        <>
          <span className="field-heading">
            <span>{parts.slice(0, requiredIndex)}</span>
            <span
              className="field-required field-required-generated"
              aria-hidden="true"
            />
          </span>
          {parts.slice(requiredIndex)}
        </>
      ) : (
        children
      )}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
