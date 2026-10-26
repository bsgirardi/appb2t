"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function FormSection({
  id,
  title,
  description,
  summary,
  collapsible = false,
  defaultOpen = true,
  hasErrors = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  hasErrors?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (hasErrors && ref.current) ref.current.open = true;
  }, [hasErrors]);
  const content = (
    <div className="admin-section-content" data-slot="field-group">
      {description && (
        <p className="admin-section-description">{description}</p>
      )}
      {children}
    </div>
  );
  if (!collapsible)
    return (
      <section
        id={id}
        className="admin-form-section"
        aria-labelledby={`${id}-title`}
      >
        <header className="admin-section-heading">
          <h2 id={`${id}-title`}>{title}</h2>
          {summary && <span>{summary}</span>}
        </header>
        {content}
      </section>
    );
  return (
    <details
      id={id}
      ref={ref}
      className="admin-form-section"
      open={defaultOpen || hasErrors}
    >
      <summary className="admin-section-heading">
        <span id={`${id}-title`}>{title}</span>
        {summary && <small>{summary}</small>}
        <ChevronDown aria-hidden="true" />
      </summary>
      {content}
    </details>
  );
}
