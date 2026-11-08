export { Link, Image } from "./admin-preview-adapters";

export function usePathname() {
  const view = new URLSearchParams(location.search).get("view");
  return view === "entries"
    ? "/financeiro/lancamentos"
    : view === "movements"
      ? "/financeiro/movimentos"
      : view === "tax"
        ? "/financeiro/tributos"
        : view === "settings"
          ? "/configuracoes"
          : "/financeiro";
}

export function useRouter() {
  return { push() {}, replace() {}, refresh() {} };
}
