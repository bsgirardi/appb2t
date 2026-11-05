// @vitest-environment jsdom
import React from "react";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PlanningIssues } from "@/components/planning/issues";
import { batchIssues } from "@/domain/planning/issues";
afterEach(cleanup);
it("opens the actual batch and states how to verify resolution", () => {
  const open = vi.fn();
  render(
    <PlanningIssues
      issues={batchIssues([{ code: "DURATION", kind: "batch", id: "b" }])}
      onOpenTarget={open}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Revisar e confirmar/ }));
  expect(open).toHaveBeenCalledWith({ kind: "batch", id: "b" });
  expect(screen.getByText(/Duração positiva confirmada/)).toBeTruthy();
});
