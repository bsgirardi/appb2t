import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
export function Link({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} />;
}
export function Image(
  props: ImgHTMLAttributes<HTMLImageElement> & {
    unoptimized?: boolean;
    priority?: boolean;
  },
) {
  const { alt = "", ...attributes } = props;
  delete attributes.unoptimized;
  delete attributes.priority;
  // This adapter intentionally tests an ordinary image without a Next server.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...attributes} alt={alt} />;
}
export function useRouter() {
  return { push() {}, replace() {}, refresh() {} };
}
export function usePathname() {
  return "/produtos";
}
export function useSearchParams() {
  return new URLSearchParams();
}
