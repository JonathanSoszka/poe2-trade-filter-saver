// net-hook.js — runs in the MAIN world (the page's own JS context).
//
// Why this file exists:
// A normal (ISOLATED-world) content script shares the DOM with the page but
// gets its OWN copy of `window.fetch` / `XMLHttpRequest`. When the trade site
// calls `fetch(...)`, it uses the *page's* copy, which the content script can't
// see. So to observe the search POST we must run here, in the MAIN world, and
// wrap the page's real `fetch`/XHR before the page ever calls them (hence
// run_at: document_start in the manifest).
//
// This file does NOT touch chrome.* APIs (it can't — MAIN world has no
// extension privileges). It only observes network calls and hands the data to
// the ISOLATED content script via window.postMessage.

(() => {
  "use strict";

  // The endpoint we care about. A search POST goes to:
  //   /api/trade2/search/poe2/<League>
  // (League is URL-encoded, e.g. "Runes%20of%20Aldur"). We match loosely so we
  // don't hardcode the league.
  const SEARCH_ENDPOINT = "/api/trade2/search/poe2/";

  // Tag every message so the content script can trust the source.
  const CHANNEL = "POE2_FILTER_SAVER";

  // Post a captured event to the ISOLATED-world content script. Same window,
  // same origin — postMessage is the supported MAIN <-> ISOLATED bridge.
  function emit(payload) {
    try {
      window.postMessage({ channel: CHANNEL, ...payload }, window.location.origin);
    } catch (err) {
      // Never let our instrumentation break the page.
      console.warn("[PoE2 Filter Saver] emit failed:", err);
    }
  }

  function isSearchUrl(url) {
    // url may be a string or a Request/URL object.
    try {
      const s = typeof url === "string" ? url : (url && url.url) || String(url);
      return s.includes(SEARCH_ENDPOINT);
    } catch {
      return false;
    }
  }

  // Only the POST to the search endpoint carries the query body. GETs to the
  // same path (e.g. loading an existing search id) don't, so we filter on both.
  function isSearchPost(url, method) {
    return isSearchUrl(url) && String(method || "GET").toUpperCase() === "POST";
  }

  // ---- Wrap fetch -----------------------------------------------------------
  const realFetch = window.fetch;
  if (typeof realFetch === "function") {
    window.fetch = function (input, init) {
      let url = input;
      let method = (init && init.method) || (input && input.method) || "GET";
      let body = init && init.body;

      // When called as fetch(new Request(...)), the body/method live on the
      // Request object instead of init.
      if (input && typeof input === "object" && "url" in input) {
        url = input.url;
        method = init?.method || input.method || method;
      }

      const capture = isSearchPost(url, method);
      if (capture) {
        emit({
          kind: "search-request",
          url: typeof url === "string" ? url : String(url),
          method: String(method).toUpperCase(),
          // body is usually a JSON string here. Pass it through raw; the
          // content script parses/logs it.
          body: typeof body === "string" ? body : null,
        });
      }

      const promise = realFetch.apply(this, arguments);

      if (capture) {
        // Clone the response so we can peek at its shape (search id, result ids)
        // without consuming the body the page needs. This is temporary
        // milestone-1 instrumentation to inform the reload strategy.
        promise
          .then((res) => {
            try {
              res.clone().text().then((text) => {
                emit({ kind: "search-response", url: String(url), body: text });
              });
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }

      return promise;
    };
  }

  // ---- Wrap XMLHttpRequest ---------------------------------------------------
  // The site currently uses fetch, but wrap XHR too so we're robust if that
  // changes. We stash url/method on open(), and read the body on send().
  const RealXHR = window.XMLHttpRequest;
  if (RealXHR) {
    const realOpen = RealXHR.prototype.open;
    const realSend = RealXHR.prototype.send;

    RealXHR.prototype.open = function (method, url) {
      this.__poe2_method = method;
      this.__poe2_url = url;
      return realOpen.apply(this, arguments);
    };

    RealXHR.prototype.send = function (body) {
      if (isSearchPost(this.__poe2_url, this.__poe2_method)) {
        emit({
          kind: "search-request",
          url: String(this.__poe2_url),
          method: String(this.__poe2_method).toUpperCase(),
          body: typeof body === "string" ? body : null,
        });

        this.addEventListener("load", () => {
          try {
            emit({
              kind: "search-response",
              url: String(this.__poe2_url),
              body: typeof this.responseText === "string" ? this.responseText : null,
            });
          } catch {
            /* ignore */
          }
        });
      }
      return realSend.apply(this, arguments);
    };
  }

  // ---- Reload: re-run a saved search from the page context ------------------
  // The ISOLATED content script asks us (the MAIN world) to POST a saved query,
  // because doing it here is byte-for-byte how the site itself calls the API —
  // same origin, same cookies, same headers — which is the most robust way to
  // avoid the request being rejected. We reply with the fresh search id.
  //
  // We use `realFetch` (the ORIGINAL, un-wrapped fetch) on purpose: a reload
  // isn't a user-initiated search, so it must NOT be captured as the "current"
  // filter.
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.kind !== "reload-request") return;

    const { reqId, url, body } = data;
    const fetchFn = typeof realFetch === "function" ? realFetch : window.fetch;

    fetchFn
      .call(window, url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body,
      })
      .then((res) =>
        res
          .json()
          .catch(() => null)
          .then((json) => ({ res, json }))
      )
      .then(({ res, json }) => {
        emit({
          kind: "reload-response",
          reqId,
          ok: res.ok && !!(json && json.id),
          status: res.status,
          id: json && json.id ? json.id : null,
          error: res.ok
            ? json && json.id
              ? null
              : "no search id in response"
            : (json && json.error && json.error.message) || `HTTP ${res.status}`,
        });
      })
      .catch((err) => {
        emit({ kind: "reload-response", reqId, ok: false, error: String(err) });
      });
  });

  console.log("[PoE2 Filter Saver] net-hook installed (MAIN world).");
})();
