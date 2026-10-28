"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  currentTheme,
  setTheme,
  subscribeTheme,
  watchTheme,
  type ThemePreference,
} from "@/lib/theme-preference";
const labels = { system: "automático", light: "claro", dark: "escuro" };
const next: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};
export function ThemeController() {
  useEffect(watchTheme, []);
  return null;
}
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const preference = useSyncExternalStore(
    subscribeTheme,
    currentTheme,
    () => "system" as const,
  );
  const Icon =
    preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("theme-toggle", compact && "min-w-11")}
      size={compact ? "icon" : "default"}
      title={
        compact
          ? `Tema: ${labels[preference]}. Alterar para ${labels[next[preference]]}.`
          : undefined
      }
      aria-label={`Tema atual: ${labels[preference]}. Alterar para ${labels[next[preference]]}.`}
      onClick={() => setTheme(next[preference])}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {!compact && <span>Tema: {labels[preference]}</span>}
    </Button>
  );
}
