# AGENTS.md — PoE2 Trade Filter Saver

Conventions and orientation for anyone (human or agent) working on this repo.

## What this is

A Manifest V3 Chrome extension that adds **save / organize / reload of search
filters** to the official Path of Exile 2 trade site
(`https://www.pathofexile.com/trade2`). Everything is local to the browser: no
servers, no accounts, no analytics, no third-party calls.

The current league during development is **Runes of Aldur**, but nothing is
hardcoded to it — the league is always read from the page URL.

## How the trade site works (the mechanics we rely on)

- Search page: `https://www.pathofexile.com/trade2/search/poe2/<League>`
  (`<League>` is URL-encoded, e.g. `Runes%20of%20Aldur`).
- Running a search sends a **POST** to
  `https://www.pathofexile.com/api/trade2/search/poe2/<League>`. **The request
  body is the JSON `query` object — that JSON is the filter state we save.** The
  response returns a search `id` plus result ids.
- After a search the URL becomes `.../trade2/search/poe2/<League>/<searchId>`.
  Search ids are **server-side and can expire**, so we store the full query
  JSON, never just the id.
- Result details come from a follow-up GET to `/api/trade2/fetch/<ids>`. Not
  needed for saving/reloading filters.

**Confirmed shapes (from a real search):**

- Request body: `{ "query": {…}, "sort": {…} }`. **`sort` is a sibling of
  `query`, not nested** — both must be saved to reproduce a search.
- Response: `{ "id": "MdOEXPJRiJ", "complexity": N, "result": [ …ids… ],
  "total": N }`. The top-level `id` is the search id for the URL — this is what
  the re-POST reload navigates to.

### Capturing the query (the key trick)

Content scripts run in an ISOLATED world and can't see the page's own
`fetch`/XHR. So we inject `src/inject/net-hook.js` into the **MAIN world** at
`document_start`; it wraps `window.fetch` and `XMLHttpRequest`, watches for
`/api/trade2/search/` POSTs, and `postMessage`s the captured body to the
ISOLATED content script (`src/content/content.js`). The two communicate over a
`window.postMessage` channel tagged `POE2_FILTER_SAVER`, origin-checked on the
receiving side.

## Project layout

```
manifest.json              MV3 manifest (permissions, content-script wiring)
src/
  inject/net-hook.js        MAIN world: wraps fetch/XHR, emits captured query
  content/content.js        ISOLATED world: receives captures, owns storage/UI
  background/               service worker (added when needed)
  ui/                       side-drawer UI (milestone 4)
  lib/                      storage helpers etc.
icons/                      placeholder icons (16/48/128)
```

## Gotchas learned the hard way

- **Don't inject UI into the site's own controls.** That area is
  framework-managed; the page re-renders it and wipes our button out (it
  "disappears"). The toolbar lives as a **floating element in `<body>`** with a
  cheap 2s self-heal that re-adds it if removed.
- **No subtree `MutationObserver` that also mutates the DOM.** An observer on
  `document.documentElement` whose callback changes the DOM feedback-loops the
  trade site into a freeze. Use bounded polling / self-heal instead.

## Decisions locked for this build

- **Vanilla JS, no framework, no bundler.** Keep mechanics visible. Raise a
  build step for discussion before adding one.
- **UI surface: injected side drawer** (not a popup) for the saved-filter list.
- **Reload strategy: re-POST the stored query JSON** to the search endpoint with
  `credentials: 'include'`, get a fresh search id, navigate to it. (Response
  shape to be confirmed at milestone 2 before wiring in.)
- Storage: `chrome.storage.local`. Record shape (refine as needed):
  `{ id, title, league, query, sort, note, savedAt }`.
- Permissions stay minimal: `storage` + host `*://www.pathofexile.com/*`. No
  `webRequest`, no broad permissions — the MAIN-world hook makes them
  unnecessary.

## Non-goals (ToS guardrails — do not cross)

- Only captures/replays the user's own, **manually-initiated** searches. No
  background polling, timers, auto-sniping, or keystroke automation. Every
  action is one-click and user-triggered.
- No scraping beyond what the browser already does in a normal search.
- No credentials handling, no cookie exfiltration — rely only on the browser's
  existing same-origin session.

## How to load the unpacked extension

1. Open `chrome://extensions` (works on Chrome 111+, Edge, Brave).
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked** and select this repo's root folder (the one with
   `manifest.json`).
4. Open a PoE2 trade search page, e.g.
   `https://www.pathofexile.com/trade2/search/poe2/Runes%20of%20Aldur`.
5. Open DevTools → Console. You should see:
   - `[PoE2 Filter Saver] net-hook installed (MAIN world).`
   - `[PoE2 Filter Saver] content script loaded. league="..."`
6. Run a search. The console logs the captured query JSON and the response
   shape.

After changing files, click the **reload** ↻ icon on the extension card in
`chrome://extensions`, then reload the trade page.

## Build milestones

1. **Skeleton** — manifest + MAIN-world capture wired up, logs the query. ✅ done
2. **Capture** — verify the query JSON against real searches; inspect response shape. ✅ done
3. **Persist** — inject a Save button, write current query to storage. ✅ done
4. **List + reload** — side drawer listing saved filters, one-click reload. ✅ done
   - Reload re-POSTs `{query, sort}` from the **MAIN world** (via net-hook) so it
     mirrors the site's own call exactly; content.js navigates to the new id.
5. **Manage** — rename, delete, notes. ✅ done
6. **Backup** — export/import all filters as versioned JSON (non-destructive merge). ✅ done
   - Backup envelope: `{ type: "poe2-filter-saver-backup", version: 1, exportedAt,
     count, filters }`. Import accepts a bare array too. Merge dedups by `id`,
     never overwrites/removes existing.

All six milestones complete. Stop and check in after each future change.
