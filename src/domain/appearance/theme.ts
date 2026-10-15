import { defaultSiteColors, type SiteColors } from "./site-colors";
import type { AppearancePalette } from "./types";
import { contrastRatio, readableText } from "./colors";
export function themeVariables<T extends AppearancePalette>(appearance: T) {
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

export function siteThemeVariables<T extends Partial<SiteColors>>(
  appearance: T,
) {
  const colors = {
    siteLightPrimary:
      appearance.siteLightPrimary ?? defaultSiteColors.siteLightPrimary,
    siteLightAccent:
      appearance.siteLightAccent ?? defaultSiteColors.siteLightAccent,
    siteDarkPrimary:
      appearance.siteDarkPrimary ?? defaultSiteColors.siteDarkPrimary,
    siteDarkAccent:
      appearance.siteDarkAccent ?? defaultSiteColors.siteDarkAccent,
  };
  const text = (background: string, preferred: string) =>
    contrastRatio(background, preferred) >= 4.5
      ? preferred
      : readableText(background);
  return {
    "--site-light-primary": colors.siteLightPrimary,
    "--site-light-accent": colors.siteLightAccent,
    "--site-dark-primary": colors.siteDarkPrimary,
    "--site-dark-accent": colors.siteDarkAccent,
    "--site-light-on-primary": text(colors.siteLightPrimary, "#ffffff"),
    "--site-light-on-accent": text(colors.siteLightAccent, "#0d2b52"),
    "--site-dark-on-primary": text(colors.siteDarkPrimary, "#0d2b52"),
    "--site-dark-on-accent": text(colors.siteDarkAccent, "#0d2b52"),
  };
}
