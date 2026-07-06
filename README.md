# PoE2 Trade Filter Saver

Chrome extension that lets you save searches on the [Path of Exile 2 trade
site](https://www.pathofexile.com/trade2) and pull them back up later. The site
itself has no way to bookmark a search, which gets annoying fast when you're
re-typing the same filters every session. This fixes that.

Everything stays in your own browser. There's no server, no account, and nothing
gets sent anywhere.

Works on Chrome, Edge and Brave (Chrome 111+), and on Firefox 128+.

## Installing

It's not on the Web Store, so you load it by hand:

1. Grab the latest zip from the
   [Releases page](https://github.com/JonathanSoszka/poe2-trade-filter-saver/releases/latest)
   and unzip it. (Or just clone this repo if you'd rather.)
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Switch on Developer mode, top-right.
4. Hit "Load unpacked" and point it at the folder that has `manifest.json` in it.

If you change the code later, click the reload icon on the extension's card and
refresh the trade page.

### Firefox

Firefox 128 or newer (it relies on a content-script feature added in 128).

1. Go to `about:debugging` → This Firefox → **Load Temporary Add-on**.
2. Pick the `manifest.json` from the unzipped folder.
3. Open a trade search page. The first time, Firefox may ask you to allow the
   extension to access `pathofexile.com` — you have to grant that (Firefox treats
   site access as optional), otherwise it can't capture or reload searches.

Temporary add-ons are cleared when you restart Firefox, so you'd reload it the
same way next time. For a permanent install the add-on has to be signed through
Mozilla, which isn't set up here yet.

## Using it

Open a trade search for your league, e.g.

```
https://www.pathofexile.com/trade2/search/poe2/Runes%20of%20Aldur
```

It only runs on `trade2/search` pages and figures out the league from the URL,
so it isn't tied to any particular league.

Set up a search the normal way and run it. A little toolbar sits in the
bottom-right corner with two buttons:

- **Save filter** stays greyed out until you've actually run a search. Click it
  and you get a dialog: type a name to save it as a new filter, or pick an
  existing one from the "Overwrite existing" dropdown to replace it with whatever
  you've got on screen now.
- **Saved (N)** opens the drawer with everything you've saved.

In the drawer, each saved search has a Reload button in its corner. Reload just
re-runs the search and drops you on fresh results. It stores the whole query
rather than the search link, so it still works after the original link has
expired (which they do, server-side, after a while). Anything you saved under a
different league gets tagged so you know reloading it will jump leagues.

There's a pencil next to each name for renaming, a Delete button, and a
collapsible "Filter details" section if you want to see what's actually in a
saved search (category, price, stat filters, sort, and the raw JSON).

## Backups

The bottom of the drawer has Export and Import. Export dumps everything to a
`poe2-filters-YYYY-MM-DD.json` file. Import merges a file back in without
touching what you already have. Anything it's already got (matched by id) is
skipped, and it'll tell you how many it added versus skipped. Handy for moving
your filters to another machine.

## About privacy / GGG's rules

Filters live in `chrome.storage.local`, so they're just on your machine. No
tracking, no external calls.

Reloading a search uses the session you're already logged into (the normal
same-origin cookies), the same as if you'd clicked a link. It doesn't read or
send your login anywhere.

It only ever replays searches you ran yourself, one click at a time. No polling,
no timers, nothing running in the background. That's deliberate, since GGG's
terms don't allow automated hammering of the trade endpoints, and this stays
well clear of that.

## Troubleshooting

- Toolbar not showing up? Make sure you're on a `trade2/search/poe2/...` page and
  that the extension is enabled, then refresh.
- Changed the code and nothing's different? Reload the extension from
  `chrome://extensions` first, then refresh the page.
- Won't load at all? You probably picked a subfolder. Point "Load unpacked" at
  the folder with `manifest.json` in it.

## Permissions

It asks for `storage` (to keep your saved filters) and access to
`www.pathofexile.com` (to run on the trade pages and re-run searches). Nothing
else.

---

See [AGENTS.md](AGENTS.md) if you want the developer notes.
