import type { PublicAppearanceDTO } from "./types";
import { readableText } from "./colors";
export function themeVariables(appearance: PublicAppearanceDTO) {
  return {
    "--light-primary": appearance.lightPrimary,
    "--light-accent": appearance.lightAccent,
    "--dark-primary": appearance.darkPrimary,
    "--dark-accent": appearance.darkAccent,
    "--light-on-primary": readableText(appearance.lightPrimary),
    "--light-on-accent": readableText(appearance.lightAccent),
    "--dark-on-primary": readableText(appearance.darkPrimary),
    "--dark-on-accent": readableText(appearance.darkAccent),
  };
}
