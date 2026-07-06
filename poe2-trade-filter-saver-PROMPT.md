# Project kickoff: PoE2 Trade Filter Saver (Chrome extension)

This file is my opening brief for the session. Read it fully, then **propose a file structure and a plan before writing code**. Ask me about anything ambiguous — don't guess on the decisions I've flagged as "confirm with me."

---

## Goal

Build a Manifest V3 Chrome extension that adds **save / organize / reload of search filters** to the official Path of Exile 2 trade site (`https://www.pathofexile.com/trade2`). The official site has no native "save this search" feature; I want to add one that lives entirely in my own browser session.

My current league is **Runes of Aldur**, but nothing should be hardcoded to it — read the league from the page/URL.

---

## How the trade site actually works (use this, don't re-derive it)

- The search page is `https://www.pathofexile.com/trade2/search/poe2/<League>` (League is URL-encoded, e.g. `Runes%20of%20Aldur`).
- When I run a search, the page sends a **POST** to `https://www.pathofexile.com/api/trade2/search/poe2/<League>`. The **request body is a JSON `query` object** — that JSON *is* the filter state I want to save. The response returns a `id` (the search id) plus a list of result ids.
- After a search, the page URL becomes `.../trade2/search/poe2/<League>/<searchId>`. **Search ids are server-side and can expire**, so do NOT rely on storing just the id. Store the full query JSON so a saved filter can always be re-created.
- Result details come from a follow-up **GET** to `/api/trade2/fetch/<ids>` (batched). We probably don't need this for v1 — saving/reloading filters doesn't require fetching results — but note it exists.

### Capturing the query JSON — the main gotcha
Content scripts run in an isolated world and **cannot see the page's own `fetch`/XHR calls**. To capture the POST body, inject a script into the **MAIN world** (MV3 supports `"world": "MAIN"` in `content_scripts`, or inject a `<script>` tag) that wraps `window.fetch` (and `XMLHttpRequest` if needed), watches for calls to the `/api/trade2/search/` endpoint, and `postMessage`s the captured request body back to the isolated content script. Start by just capturing and `console.log`-ing the query to prove this works before building any UI.

### Reloading a saved filter
Preferred approach: from the trade page context, **re-POST the stored query JSON** to `/api/trade2/search/poe2/<League>` with `credentials: 'include'` (same-origin, so cookies ride along) to get a fresh search id, then navigate to `.../trade2/search/poe2/<League>/<newId>`. Alternative fallback: drive the site's own UI to re-run the search. Let's discuss which is cleaner once we see the response shape.

---

## Tech / constraints

- **Manifest V3.** Target Chrome 111+ (also fine on Edge/Brave).
- **Default: vanilla JS, no framework, no bundler** to start — I want the mechanics visible and the extension small. If a build step becomes clearly worth it later, raise it and we'll decide. *(Confirm with me before adding any framework or bundler.)*
- Storage: `chrome.storage.local`. Suggested record shape — refine as needed:
  ```
  { id, title, league, query /*the JSON*/, sort, note, savedAt }
  ```
- No external servers, no accounts, no analytics, no third-party calls. Everything local.
- Permissions: keep them minimal. Host permission for `*://www.pathofexile.com/*`, plus `storage`. Avoid `webRequest`/broad permissions if the MAIN-world fetch wrapper makes them unnecessary.

---

## Build plan (milestones — let's do these in order, checking in between)

1. **Skeleton** — manifest, content script that confirms it loads on `trade2` search pages, MAIN-world injection wired up.
2. **Capture** — intercept the search POST, extract the query JSON, log it. Verify against a couple of real searches.
3. **Persist** — a "Save" affordance (button injected near the site's Clear/Search controls) that writes the current query to `chrome.storage.local`.
4. **List + reload** — UI (popup or an injected side drawer — *confirm which you'd recommend*) listing saved filters, each with a one-click reload.
5. **Manage** — rename, delete, add a note.
6. **Backup** — export/import all saved filters as a versioned JSON file (non-destructive import/merge).

Stop after each milestone and show me what changed.

---

## Non-goals / stay-in-bounds (important)

- This only captures and replays **my own, manually-initiated** searches — no background polling, no timers, no live-search auto-sniping, no keystroke automation. Every action is one-click, user-triggered. Keeping it to that avoids GGG ToS trouble (their terms don't sanction automated/programmatic use of the internal trade endpoints).
- Don't reverse-engineer or scrape anything beyond what my browser already does during a normal search.
- No credentials handling, no cookie exfiltration — we only rely on the browser's existing same-origin session.

---

## Reference implementations (consult for approach, don't copy wholesale)

- `github.com/HazAT/poe-item-search` — MV3 extension doing search history + bookmarks on trade/trade2, preserves sort order on reload.
- "POE2 - Save Trade Filter" (Chrome Web Store, open-source, link to its GitHub repo is on the store page) — closest to this exact feature; good for seeing how they capture and re-apply the filter.

---

## How I want you to work in this session

- Propose the file structure and milestone-1 plan **before** writing code; wait for my go-ahead.
- Prefer small, readable diffs. Explain any non-obvious browser-extension mechanics inline as comments.
- Flag the "confirm with me" decisions rather than picking silently: framework/bundler, popup vs. drawer, reload strategy.
- Set up the repo with an `AGENTS.md` (project conventions + how to run/load the unpacked extension) so future sessions have context.
