"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsLocation, analyticsPage } from "@/domain/marketing/tracking";
import { Button } from "@/components/ui/button";
const KEY = "b2t:analytics-consent:v1";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("b2t-consent", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("b2t-consent", listener);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return "denied";
  }
}
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    b2tAnalyticsId?: string;
  }
}
export function StoreAnalytics({ measurementId }: { measurementId: string }) {
  const consent = useSyncExternalStore(subscribe, snapshot, () => null);
  const pathname = usePathname(),
    params = useSearchParams();
  const lastPage = useRef("");
  const query = params.toString();
  function choose(value: string) {
    try {
      (window as unknown as Record<string, unknown>)[
        `ga-disable-${measurementId}`
      ] = value !== "granted" || navigator.doNotTrack === "1";
      localStorage.setItem(KEY, value);
      window.dispatchEvent(new Event("b2t-consent"));
    } catch {
      /* No persistent permission means no collection. */
    }
  }
  useEffect(() => {
    if (
      consent !== "granted" ||
      navigator.doNotTrack === "1" ||
      !analyticsPage(pathname)
    )
      return;
    const location = analyticsLocation(window.location.href);
    if (!location) return;
    if (!window.b2tAnalyticsId) {
      window.dataLayer ??= [];
      // gtag's queue expects its Arguments object, not a spread array.
      // Google's supported queue contract uses IArguments.
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      const gtag = window.gtag;
      gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      gtag("js", new Date());
      gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: location,
        page_referrer: "",
        page_title: "B2T",
      });
      window.b2tAnalyticsId = measurementId;
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.b2tAnalyticsId !== measurementId) return;
    const key = pathname + "?" + query;
    if (lastPage.current !== key) {
      lastPage.current = key;
      window.gtag?.("event", "page_view", {
        page_location: location,
        page_referrer: "",
        page_title:
          analyticsPage(pathname) === "/"
            ? "B2T | Início"
            : "B2T | Catálogo e informações",
      });
    }
    function click(event: MouseEvent) {
      if (snapshot() !== "granted" || !analyticsPage(window.location.pathname))
        return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("/catalogo"))
        window.gtag?.("event", "catalog_open", {
          page_location: location,
          page_referrer: "",
        });
      else if (href.startsWith("mailto:") || href.startsWith("https://wa.me/"))
        window.gtag?.("event", "contact_click", {
          contact_method: href.startsWith("mailto:") ? "email" : "whatsapp",
          page_location: location,
          page_referrer: "",
        });
    }
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [consent, measurementId, pathname, query]);
  if (!analyticsPage(pathname)) return null;
  return (
    <section
      aria-label="Preferências de medição"
      className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 border-t border-border px-4 py-5 text-sm"
    >
      {consent === null ? (
        <>
          <p>
            Podemos usar o Google Analytics para medir a navegação e os cliques
            neste site? A escolha é opcional e pode ser alterada aqui.
          </p>
          <Button type="button" onClick={() => choose("granted")}>
            Aceitar medição
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => choose("denied")}
          >
            Continuar sem medição
          </Button>
        </>
      ) : (
        <>
          <p>
            Medição de navegação:{" "}
            {consent === "granted" ? "permitida" : "desativada"}.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              choose(consent === "granted" ? "denied" : "granted");
              if (consent === "granted") window.location.reload();
            }}
          >
            {consent === "granted" ? "Desativar medição" : "Permitir medição"}
          </Button>
        </>
      )}
    </section>
  );
}
