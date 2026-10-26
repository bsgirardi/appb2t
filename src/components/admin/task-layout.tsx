import type { ReactNode } from "react";
export function TaskLayout({
  children,
  summary,
}: {
  children: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <div
      className={
        summary ? "admin-task-layout" : "admin-task-layout admin-task-single"
      }
    >
      <div className="admin-task-content">{children}</div>
      {summary && (
        <aside className="admin-task-summary" aria-label="Resumo da tarefa">
          {summary}
        </aside>
      )}
    </div>
  );
}
