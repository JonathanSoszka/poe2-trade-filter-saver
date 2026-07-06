// content.js — ISOLATED world. The privileged coordinator: owns storage access
// (via window.PoE2FilterStore), the injected toolbar (Save + Saved), and the
// reload round-trip to the MAIN-world net-hook. Loaded last of the ISOLATED
// scripts, so PoE2FilterStore and PoE2Drawer already exist.
//
// Milestones 3 (persist) + 4 (list + reload).

(() => {
  "use strict";

  const CHANNEL = "POE2_FILTER_SAVER";
  const store = window.PoE2FilterStore;
  const drawer = window.PoE2Drawer;

  // ---- League / search-id from URL -----------------------------------------
  function readLeagueFromUrl() {
    const m = window.location.pathname.match(/\/trade2\/search\/poe2\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function readSearchIdFromUrl() {
    const m = window.location.pathname.match(/\/trade2\/search\/poe2\/[^/]+\/([^/]+)/);
    return m ? m[1] : null;
  }

  // ---- Latest capture -------------------------------------------------------
  let lastCapture = null; // { query, sort, league, capturedAt }

  console.log(
    `[PoE2 Filter Saver] content script loaded. league=${JSON.stringify(readLeagueFromUrl())} searchId=${JSON.stringify(readSearchIdFromUrl())}`
  );

  // ---- Reload round-trip bookkeeping ---------------------------------------
  const pendingReloads = new Map(); // reqId -> { resolve, league, title }

  // ---- Receive messages from the MAIN-world net-hook ------------------------
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL) return;

    if (data.kind === "search-request") {
      try {
        const parsed = data.body ? JSON.parse(data.body) : null;
        if (parsed) {
          // Body is { query, sort } — sort is a SIBLING of query; save both.
          lastCapture = {
            query: parsed.query ?? null,
            sort: parsed.sort ?? null,
            league: readLeagueFromUrl(),
            capturedAt: Date.now(),
          };
          console.log("[PoE2 Filter Saver] captured search:", lastCapture);
          reflectCaptureState();
        }
      } catch (err) {
        console.warn("[PoE2 Filter Saver] could not parse search body:", err, data.body);
      }
    } else if (data.kind === "search-response") {
      try {
        const parsed = data.body ? JSON.parse(data.body) : null;
        console.log("[PoE2 Filter Saver] search response id:", parsed && parsed.id, "total:", parsed && parsed.total);
      } catch {
        /* ignore */
      }
    } else if (data.kind === "reload-response") {
      const pending = pendingReloads.get(data.reqId);
      if (!pending) return;
      pendingReloads.delete(data.reqId);
      if (data.ok && data.id) {
        // Navigate to the fresh search. Content scripts share window.location
        // with the page, so this drives the actual page navigation.
        const target = `${window.location.origin}/trade2/search/poe2/${encodeURIComponent(pending.league)}/${data.id}`;
        window.location.assign(target);
        pending.resolve(true);
      } else {
        console.warn("[PoE2 Filter Saver] reload failed:", data);
        toast(`Reload failed: ${data.error || "unknown error"}`);
        pending.resolve(false);
      }
    }
  });

  // ---- Reload a saved filter (re-POST via MAIN world) -----------------------
  function reload(record) {
    return new Promise((resolve) => {
      if (!record || !record.query) {
        toast("This filter has no query saved.");
        return resolve(false);
      }
      const league = record.league || readLeagueFromUrl();
      if (!league) {
        toast("Couldn't determine the league for this filter.");
        return resolve(false);
      }
      const url = `${window.location.origin}/api/trade2/search/poe2/${encodeURIComponent(league)}`;
      // Rebuild the exact request body shape: { query, sort }. Omit sort if the
      // record didn't have one.
      const payload = { query: record.query };
      if (record.sort) payload.sort = record.sort;
      const body = JSON.stringify(payload);

      const reqId = "r" + Date.now() + "_" + Math.random().toString(36).slice(2);
      pendingReloads.set(reqId, { resolve, league, title: record.title });
      toast(`Reloading “${record.title}”…`);

      window.postMessage({ channel: CHANNEL, kind: "reload-request", reqId, url, body }, window.location.origin);

      // Safety net so a lost message doesn't leave the button stuck.
      setTimeout(() => {
        if (pendingReloads.has(reqId)) {
          pendingReloads.delete(reqId);
          toast("Reload timed out — see console.");
          resolve(false);
        }
      }, 15000);
    });
  }

  // Expose to the drawer: reload, a way to refresh the "Saved (N)" badge after
  // storage changes (delete/import/save), and the shared toast.
  window.PoE2FilterSaver = {
    reload,
    refreshCount: () => updateSavedCount(),
    toast: (msg) => toast(msg),
  };

  // ---- Toolbar UI (Save + Saved) -------------------------------------------
  const TOOLBAR_ID = "poe2fs-toolbar";
  const SAVE_ID = "poe2fs-save-btn";
  const SAVED_ID = "poe2fs-saved-btn";

  function reflectCaptureState() {
    const btn = document.getElementById(SAVE_ID);
    if (!btn) return;
    const ready = !!lastCapture;
    btn.disabled = !ready;
    btn.title = ready
      ? "Save the current search as a reusable filter"
      : "Run a search first, then save it";
  }

  async function updateSavedCount() {
    const btn = document.getElementById(SAVED_ID);
    if (!btn || !store) return;
    const n = (await store.getAll()).length;
    btn.textContent = `📁 Saved (${n})`;
  }

  function onSaveClick() {
    if (!lastCapture) {
      toast("Run a search first, then click Save.");
      return;
    }
    const suggested = suggestTitle(lastCapture);
    const capture = { query: lastCapture.query, sort: lastCapture.sort, league: lastCapture.league };

    // The Save dialog (in drawer.js) offers "new filter" or "overwrite existing"
    // via a dropdown. It handles storage, the badge count, and the toast.
    if (drawer && typeof drawer.openSaveDialog === "function") {
      drawer.openSaveDialog(capture, suggested);
      return;
    }

    // Fallback if the drawer script somehow isn't present: quick new save.
    const title = window.prompt("Name this filter:", suggested);
    if (title === null) return;
    store
      .add({ title: title.trim() || suggested, league: capture.league, query: capture.query, sort: capture.sort, note: "" })
      .then(async () => {
        await updateSavedCount();
        toast(`Saved “${title.trim() || suggested}”.`);
      })
      .catch((err) => {
        console.error("[PoE2 Filter Saver] save failed:", err);
        toast("Save failed — see console.");
      });
  }

  function suggestTitle(cap) {
    try {
      const cat = cap.query?.filters?.type_filters?.filters?.category?.option;
      if (cat) return String(cat).split(".").pop();
    } catch {
      /* ignore */
    }
    return "Filter " + new Date(cap.capturedAt).toLocaleString();
  }

  function makeToolbar() {
    const saveBtn = document.createElement("button");
    saveBtn.id = SAVE_ID;
    saveBtn.type = "button";
    saveBtn.textContent = "💾 Save filter";
    saveBtn.className = "poe2fs-btn";
    saveBtn.addEventListener("click", onSaveClick);

    const savedBtn = document.createElement("button");
    savedBtn.id = SAVED_ID;
    savedBtn.type = "button";
    savedBtn.textContent = "📁 Saved";
    savedBtn.className = "poe2fs-btn";
    savedBtn.title = "Show your saved filters";
    savedBtn.addEventListener("click", () => drawer && drawer.toggle());

    const bar = document.createElement("div");
    bar.id = TOOLBAR_ID;
    bar.className = "poe2fs-toolbar";
    bar.appendChild(saveBtn);
    bar.appendChild(savedBtn);
    return bar;
  }

  // ---- Placement -----------------------------------------------------------
  // We deliberately DON'T graft the toolbar into the site's own Search/Clear
  // controls: that area is framework-managed, so when the page re-renders it,
  // our button gets wiped out (this is why it "disappeared"). Instead we keep a
  // stable floating toolbar in <body>, which the site never re-renders, and
  // re-create it if it ever goes missing.
  function ensureToolbar() {
    if (document.getElementById(TOOLBAR_ID)) return;
    if (!document.body) return;
    injectStyles();
    const bar = makeToolbar();
    bar.classList.add("poe2fs-floating");
    document.body.appendChild(bar);
    reflectCaptureState();
    updateSavedCount();
  }

  function injectStyles() {
    if (document.getElementById("poe2fs-styles")) return;
    const style = document.createElement("style");
    style.id = "poe2fs-styles";
    style.textContent = `
      .poe2fs-toolbar { display: inline-flex; gap: 6px; margin-left: 8px; vertical-align: middle; }
      .poe2fs-toolbar.poe2fs-floating {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147482000;
        margin-left: 0;
      }
      .poe2fs-btn {
        font: 600 13px/1.2 "Fontin", system-ui, sans-serif;
        color: #f0e6d2; background: #1a1410; border: 1px solid #c9a14a;
        border-radius: 3px; padding: 6px 12px; cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,.4);
      }
      .poe2fs-btn:hover:not(:disabled) { background: #2a2016; }
      .poe2fs-btn:disabled { opacity: .5; cursor: default; }
      .poe2fs-toast {
        position: fixed; right: 16px; bottom: 64px; z-index: 2147483001;
        background: #1a1410; color: #f0e6d2; border: 1px solid #c9a14a;
        border-radius: 3px; padding: 8px 12px; font: 500 13px/1.3 system-ui, sans-serif;
        max-width: 320px; box-shadow: 0 2px 10px rgba(0,0,0,.5);
        opacity: 0; transition: opacity .15s ease; pointer-events: none;
      }
      .poe2fs-toast.show { opacity: 1; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let toastTimer = null;
  function toast(msg) {
    injectStyles();
    let el = document.getElementById("poe2fs-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "poe2fs-toast";
      el.className = "poe2fs-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // ---- Boot -----------------------------------------------------------------
  function boot() {
    injectStyles();
    ensureToolbar();
    // Self-heal: if the site (or an in-app navigation) ever removes our toolbar,
    // put it back. Just a cheap getElementById on a relaxed interval — no
    // MutationObserver (that previously froze the page).
    setInterval(ensureToolbar, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
