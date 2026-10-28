"use client";

import { useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

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
  const [selection, setOpen] = useState("");
  const open = hasErrors ? "filters" : selection;
  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
      <AccordionItem value="filters" className="border-b-0">
        <AccordionTrigger className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="flex items-center gap-2">
            {title}
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} ativos</Badge>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent forceMount hidden={open !== "filters"}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
