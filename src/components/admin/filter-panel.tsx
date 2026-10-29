"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Keep controls mounted so closing a panel never discards an unfinished filter. */
export function FilterPanel({
  children,
  activeCount = 0,
  hasErrors = false,
  title = "Filtros",
}: {
  children: ReactNode;
  activeCount?: number;
  hasErrors?: boolean;
  title?: string;
}) {
  const [selection, setOpen] = useState(false);
  const open = hasErrors || selection;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card text-card-foreground"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between gap-4 px-4 py-3"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
            {title}
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} ativos</Badge>
            )}
          </span>
          <ChevronDown
            data-icon="inline-end"
            aria-hidden="true"
            className={open ? "rotate-180" : undefined}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent forceMount hidden={!open} className="px-4 pb-4 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
