type Guard = () => boolean;
type Position = { session: string; index: number };
type HistoryRecord = Record<string, unknown> & { __b2tHistory?: Position };

function position(state: unknown, session?: string): Position | undefined {
  if (!state || typeof state !== "object") return;
  const value = (state as HistoryRecord).__b2tHistory;
  if (
    value &&
    typeof value.session === "string" &&
    value.session.length > 0 &&
    (session === undefined || value.session === session) &&
    Number.isSafeInteger(value.index) &&
    value.index >= 0
  )
    return value;
}

/** Track real entries only; never insert a sentinel or store form contents. */
export function createHistoryProtection(browser: Window) {
  const { history } = browser;
  const initial = position(history.state);
  const session = initial?.session ?? crypto.randomUUID();
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  const guards = new Set<Guard>();
  let current = initial?.index ?? 0;
  let currentUrl = browser.location.href;
  let currentState: unknown = history.state;
  let returningTo: number | undefined;
  let approvedTraversal = false;
  let active = true;
  const navigation = (browser as Window & { navigation?: EventTarget })
    .navigation;
  const stateAt = (state: unknown, index: number): HistoryRecord => ({
    ...(state && typeof state === "object" ? state : {}),
    __b2tHistory: { session, index },
  });
  const allow = () => [...guards].every((guard) => guard());
  const samePage = (url: string) => {
    const from = new URL(currentUrl),
      to = new URL(url, currentUrl);
    return from.pathname === to.pathname && from.search === to.search;
  };

  const push: History["pushState"] = function (state, unused, url) {
    if (!active) return originalPush.call(history, state, unused, url);
    const next = current + 1;
    // Update only after the browser accepts the write (e.g. same-origin check).
    originalPush.call(history, stateAt(state, next), unused, url);
    current = next;
    currentUrl = browser.location.href;
    currentState = history.state;
  };
  const replace: History["replaceState"] = function (state, unused, url) {
    if (!active) return originalReplace.call(history, state, unused, url);
    originalReplace.call(history, stateAt(state, current), unused, url);
    currentUrl = browser.location.href;
    currentState = history.state;
  };
  history.pushState = push;
  history.replaceState = replace;
  originalReplace.call(history, stateAt(history.state, current), "");
  currentState = history.state;

  function navigate(event: Event) {
    approvedTraversal = false;
    if (
      returningTo !== undefined ||
      event.defaultPrevented ||
      !event.cancelable ||
      (event as Event & { navigationType?: string }).navigationType !==
        "traverse" ||
      !guards.size
    )
      return;
    const destination = (
      event as Event & { destination?: { url: string; sameDocument?: boolean } }
    ).destination;
    // Cross-document exits already have the native beforeunload confirmation.
    if (
      destination &&
      (destination.sameDocument === false || samePage(destination.url))
    )
      return;
    if (!allow()) event.preventDefault();
    else approvedTraversal = true;
  }
  function pop(event: PopStateEvent) {
    const target = position(event.state, session);
    if (!target) {
      // Native fragment links create an entry with null state. Index it without
      // changing the URL or asking about an anchor within the same form.
      const from = new URL(currentUrl),
        to = new URL(browser.location.href);
      if (
        event.state === null &&
        from.pathname === to.pathname &&
        from.search === to.search
      ) {
        current += 1;
        currentUrl = to.href;
        originalReplace.call(history, stateAt(currentState, current), "");
        currentState = history.state;
      }
      return;
    }
    if (returningTo !== undefined) {
      event.stopImmediatePropagation();
      if (target.index === returningTo) {
        current = target.index;
        currentUrl = browser.location.href;
        currentState = history.state;
        returningTo = undefined;
      } else history.go(returningTo - target.index);
      return;
    }
    const approved = approvedTraversal;
    approvedTraversal = false;
    if (
      target.index !== current &&
      !samePage(browser.location.href) &&
      !approved &&
      !allow()
    ) {
      // popstate itself cannot be canceled. Keep Next from committing the
      // destination, then traverse back to the untouched editor entry.
      event.stopImmediatePropagation();
      returningTo = current;
      history.go(current - target.index);
      return;
    }
    current = target.index;
    currentUrl = browser.location.href;
    currentState = history.state;
  }
  browser.addEventListener("popstate", pop, true);
  navigation?.addEventListener("navigate", navigate);
  return {
    addGuard(guard: Guard) {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    dispose() {
      active = false;
      guards.clear();
      browser.removeEventListener("popstate", pop, true);
      navigation?.removeEventListener("navigate", navigate);
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace)
        history.replaceState = originalReplace;
    },
  };
}

let protection: ReturnType<typeof createHistoryProtection> | undefined;
/** One coordinator for the lifetime of this document, including Strict Mode. */
export function startHistoryProtection() {
  return (protection ??= createHistoryProtection(window));
}
