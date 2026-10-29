"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme, subscribeTheme, watchTheme } from "@/lib/theme-preference";
const labels = { light: "claro", dark: "escuro" };
function visibleTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
export function ThemeController() {
  useEffect(watchTheme, []);
  return null;
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    visibleTheme,
    () => "light" as const,
  );
  const next = theme === "light" ? "dark" : "light";
  const Icon = theme === "light" ? Sun : Moon;
  const label = `Tema atual: ${labels[theme]}. Alterar para ${labels[next]}.`;
  return (
    <Button
      type="button"
      variant="outline"
      className="theme-toggle"
      size="icon"
      title={label}
      aria-label={label}
      onClick={() => setTheme(next)}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
    </Button>
  );
}
