export { Link, Image } from "./admin-preview-adapters";
export function useRouter() {
  return {
    push(url: string) {
      const q = url.split("?")[1] ?? "";
      history.pushState({}, "", `/tests/dashboard-preview.html?${q}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    replace() {},
    refresh() {},
  };
}
export function usePathname() {
  return "/dashboard";
}
