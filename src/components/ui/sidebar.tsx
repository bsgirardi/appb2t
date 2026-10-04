"use client";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
// Fixed desktop subset of shadcn Sidebar. Mobile composition uses Sheet.
export function Sidebar({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "sidebar flex flex-row flex-wrap bg-sidebar text-sidebar-foreground md:flex-col md:flex-nowrap",
        className,
      )}
      {...props}
    />
  );
}
