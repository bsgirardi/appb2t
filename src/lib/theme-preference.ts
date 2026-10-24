export type ThemePreference = "system" | "light" | "dark";
const key = "b2t:theme";
const changed = "b2t:theme-change";
export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
// Fixed code only: executes before paint, without serializing user input.
export const themeBootstrap = `(function(){var p='system';try{var v=localStorage.getItem('b2t:theme');if(v==='light'||v==='dark')p=v}catch(e){}var d=p==='dark'||(p==='system'&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePreference=p})()`;
function apply(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
  window.dispatchEvent(new Event(changed));
}
export function currentTheme(): ThemePreference {
  return parseTheme(document.documentElement.dataset.themePreference);
}
export function setTheme(preference: ThemePreference) {
  try {
    window.localStorage.setItem(key, preference);
  } catch {
    /* Keep working in memory. */
  }
  apply(preference);
}
export function subscribeTheme(listener: () => void) {
  window.addEventListener(changed, listener);
  return () => window.removeEventListener(changed, listener);
}
export function watchTheme() {
  let preference: ThemePreference = currentTheme();
  try {
    preference = parseTheme(window.localStorage.getItem(key));
  } catch {
    /* The bootstrap may already hold a choice in memory. */
  }
  apply(preference);
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const system = () => {
    if (currentTheme() === "system") apply("system");
  };
  const storage = (event: StorageEvent) => {
    if (
      (event.key === key || event.key === null) &&
      event.storageArea === window.localStorage
    )
      apply(parseTheme(event.newValue));
  };
  media?.addEventListener("change", system);
  window.addEventListener("storage", storage);
  return () => {
    media?.removeEventListener("change", system);
    window.removeEventListener("storage", storage);
  };
}
