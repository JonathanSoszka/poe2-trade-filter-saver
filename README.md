# PoE2 Trade Filter Saver

A Chrome extension that adds **save, organize, and reload of search filters** to
the official [Path of Exile 2 trade site](https://www.pathofexile.com/trade2).
The trade site has no native "save this search" feature — this adds one that
lives entirely in your own browser. No servers, no accounts, no analytics,
nothing leaves your machine.

Works on Chrome 111+, Edge, and Brave.

> **Status: feature-complete (all 6 milestones).** Save, list, one-click reload,
> rename/note/delete, and JSON export/import all work from an on-page toolbar and
> side drawer — no DevTools needed for normal use.

---

## Install (load unpacked)

The extension isn't on the Chrome Web Store — you load it directly from this
folder:

1. Download / clone this repository to a folder on your computer.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select this repository's root folder — the one
   that contains `manifest.json`.
5. The extension card appears. You're done.

> After you pull new changes or edit files, click the **reload** ↻ icon on the
> extension's card, then refresh the trade page.

---

## How to use it

### 1. Open a trade search page

Go to a PoE2 trade search for your league, for example:

```
https://www.pathofexile.com/trade2/search/poe2/Runes%20of%20Aldur
```

The extension only activates on `.../trade2/search/poe2/...` pages. It reads the
league from the page URL, so it works for **any** league automatically — nothing
is hardcoded.

### 2. Build and run a search

Use the trade site exactly as you normally would: set your filters, stats,
price, sort order, and hit **Search**. The extension quietly captures the filter
behind that search.

### 3. Save it

A small toolbar floats at the bottom-right of the page with two buttons:

- **💾 Save filter** — stores the search you just ran. It's disabled until
  you've run a search. Clicking it opens a small dialog where you can either
  **give the filter a name** to save it as new, or pick an existing filter from
  the **"Overwrite existing"** dropdown to replace it with the current search
  (keeping that filter's name and note).
- **📁 Saved (N)** — opens the drawer of everything you've saved.

### 4. Reload a saved filter

Click **📁 Saved** to slide out the drawer. Each saved filter shows its name,
league, and when you saved it. Click **Reload** and the extension re-runs that
search and drops you on a fresh result page — **even if the original search link
has expired**, because it stores the full filter, not just the (expirable) link.

Filters saved in a different league show an "other league" badge; reloading one
takes you to that league's search.

### 5. Organize them

In the drawer, each filter also has:

- **Rename** — change its name.
- **Add note / Edit note** — jot a reminder (e.g. "leveling weapon under 50c").
- **Delete** — remove it (asks for confirmation).

### 6. Back up / move to another machine

At the bottom of the drawer:

- **⬇ Export** — downloads all your filters as a `poe2-filters-YYYY-MM-DD.json`
  file.
- **⬆ Import** — merges filters from an exported file. Import is
  **non-destructive**: it never deletes or overwrites what you already have;
  filters already present (same id) are skipped, and it tells you how many were
  added vs. skipped.

---

## Privacy & fair use

- **Everything is local.** Filters are stored with your browser
  (`chrome.storage.local`). No external servers, accounts, or tracking.
- **No credentials are touched.** Reloading a saved search reuses your browser's
  existing logged-in session (same-origin cookies), exactly as clicking a link
  would. The extension never reads, stores, or transmits your login.
- **Manual only, by design.** It captures and replays *only the searches you run
  yourself*. There is no background polling, no timers, no auto-refresh, and no
  automation — every action is a single click you initiate. This keeps it within
  Grinding Gear Games' terms, which don't sanction automated use of the trade
  endpoints.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| No `[PoE2 Filter Saver]` logs in the console | Make sure you're on a `.../trade2/search/poe2/...` URL, and that the extension is enabled. Reload the page. |
| Logs stopped after editing files | Click **reload** ↻ on the extension card in the extensions page, then refresh the trade page. |
| Nothing logged when you search | Confirm the search actually fired a request (results changed). Only the search **POST** is captured, not opening an existing search link. |
| Extension won't load | Ensure you selected the folder containing `manifest.json` (the repo root), not a subfolder. |

---

## Permissions this extension asks for

- **`storage`** — to save your filters locally.
- **Access to `www.pathofexile.com`** — to run on the trade pages and re-run
  saved searches.

That's it. No broad web access, no `webRequest`, nothing beyond what's needed.

---

For project conventions and development notes, see [AGENTS.md](AGENTS.md).
