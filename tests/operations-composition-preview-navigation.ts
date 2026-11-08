export { useRouter, useSearchParams } from "./admin-preview-adapters";
export function usePathname() {
  return ["items", "receipts", "reservations", "shortage"].includes(
    new URLSearchParams(location.search).get("view") ?? "orders",
  )
    ? "/estoque"
    : "/producao";
}
