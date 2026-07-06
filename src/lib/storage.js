// storage.js — thin wrapper over extension storage for saved filters.
//
// Loaded as a content script (ISOLATED world) BEFORE content.js, so it just
// exposes a global `PoE2FilterStore`. No bundler / no ES modules by design —
// content scripts share one global scope, so a plain global is the simplest
// seam. (If we ever add a build step this becomes a real module.)
//
// Storage layout: a single key holding an array of records. Small data set
// (tens of saved filters), so one read/write of the whole list is fine and
// keeps ordering + import/export trivial later.

(() => {
  "use strict";

  // Cross-browser handle: Firefox exposes `browser` (promise-based), Chrome/Edge
  // expose `chrome` (also promise-based under MV3). Both work with await.
  const ext = globalThis.browser || globalThis.chrome;

  const KEY = "savedFilters";

  // Record shape:
  //   { id, title, league, query, sort, note, savedAt }
  // `query` and `sort` are the two sibling halves of the trade2 request body —
  // both are needed to faithfully reproduce a search (sort lives outside query).

  async function getAll() {
    const data = await ext.storage.local.get(KEY);
    const list = data[KEY];
    return Array.isArray(list) ? list : [];
  }

  async function setAll(list) {
    await ext.storage.local.set({ [KEY]: list });
    return list;
  }

  // Add a new record. Caller passes { title, league, query, sort, note }.
  // We stamp id + savedAt here. Newest goes first so the list reads recent-first.
  async function add({ title, league, query, sort, note }) {
    const record = {
      id:
        (crypto && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "f_" + Math.abs(hashString(JSON.stringify(query)) ^ Date.now())),
      title: title || "Untitled filter",
      league: league || null,
      query: query || null,
      sort: sort || null,
      note: note || "",
      savedAt: Date.now(),
    };
    const list = await getAll();
    list.unshift(record);
    await setAll(list);
    return record;
  }

  async function remove(id) {
    const list = await getAll();
    const next = list.filter((r) => r.id !== id);
    await setAll(next);
    return next;
  }

  async function update(id, patch) {
    const list = await getAll();
    const next = list.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r));
    await setAll(next);
    return next.find((r) => r.id === id) || null;
  }

  // ---- Backup: export / import (milestone 6) --------------------------------
  const BACKUP_TYPE = "poe2-filter-saver-backup";
  const BACKUP_VERSION = 1;

  // Wrap the filters in a small versioned envelope so future formats can be
  // detected and migrated.
  function buildBackup(filters) {
    return {
      type: BACKUP_TYPE,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      count: filters.length,
      filters,
    };
  }

  // Parse a backup file's text into an array of records. Lenient about the
  // envelope (accepts a bare array too) but strict about it being valid JSON of
  // the right general shape. Throws with a friendly message otherwise.
  function parseBackup(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Not valid JSON.");
    }
    const filters = Array.isArray(data) ? data : data && data.filters;
    if (!Array.isArray(filters)) {
      throw new Error("No filters array found in file.");
    }
    if (!Array.isArray(data) && data.type && data.type !== BACKUP_TYPE) {
      throw new Error(`Unrecognized backup type "${data.type}".`);
    }
    return filters;
  }

  // Non-destructive merge: existing filters are never removed or overwritten.
  // Incoming records with a brand-new id are added; ids we already have are
  // skipped, as are malformed records (no id / no query). Returns a summary.
  async function importMerge(incoming) {
    const list = await getAll();
    const existingIds = new Set(list.map((r) => r.id));
    let added = 0;
    let skipped = 0;
    const toAdd = [];

    for (const rec of Array.isArray(incoming) ? incoming : []) {
      if (!rec || !rec.id || !rec.query || existingIds.has(rec.id)) {
        skipped++;
        continue;
      }
      existingIds.add(rec.id);
      toAdd.push(rec);
      added++;
    }

    if (toAdd.length) {
      const merged = list.concat(toAdd);
      // Keep the list newest-first for a stable ordering after merge.
      merged.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      await setAll(merged);
    }
    return { added, skipped };
  }

  // Tiny non-crypto hash, only used as a randomUUID fallback for the id.
  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  window.PoE2FilterStore = {
    KEY,
    getAll,
    setAll,
    add,
    remove,
    update,
    buildBackup,
    parseBackup,
    importMerge,
  };
})();
