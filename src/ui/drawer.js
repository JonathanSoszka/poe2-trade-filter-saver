// drawer.js — ISOLATED world. The saved-filter list UI: an off-canvas panel
// that slides in from the right of the trade page. Loaded before content.js.
//
// It reads from window.PoE2FilterStore (storage.js) and delegates reload to
// window.PoE2FilterSaver.reload(record) (defined in content.js). Those globals
// exist by the time any user interaction happens, so referencing them inside
// handlers (not at load time) is safe.
//
// Milestone 4 scope: LIST + one-click RELOAD. Rename / delete / notes come in
// milestone 5 — this file is structured to grow into them.

(() => {
  "use strict";

  const PANEL_ID = "poe2fs-drawer";
  const STYLE_ID = "poe2fs-drawer-styles";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed; top: 0; right: 0; height: 100vh; width: 340px;
        max-width: 92vw; z-index: 2147483000;
        background: #14100c; color: #f0e6d2;
        border-left: 1px solid #c9a14a;
        box-shadow: -4px 0 18px rgba(0,0,0,.55);
        transform: translateX(100%); transition: transform .18s ease;
        display: flex; flex-direction: column;
        font: 14px/1.4 system-ui, sans-serif;
      }
      #${PANEL_ID}.open { transform: translateX(0); }
      #${PANEL_ID} .poe2fs-d-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px; border-bottom: 1px solid #3a2f1e;
        background: #1a1410;
      }
      #${PANEL_ID} .poe2fs-d-title { font-weight: 700; color: #c9a14a; letter-spacing: .3px; }
      #${PANEL_ID} .poe2fs-d-close {
        background: none; border: none; color: #f0e6d2; font-size: 20px;
        line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 3px;
      }
      #${PANEL_ID} .poe2fs-d-close:hover { background: #2a2016; }
      #${PANEL_ID} .poe2fs-d-list { flex: 1; overflow-y: auto; padding: 8px; }
      #${PANEL_ID} .poe2fs-d-foot {
        display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #3a2f1e;
        background: #1a1410;
      }
      #${PANEL_ID} .poe2fs-d-foot .poe2fs-btn2 { flex: 1; text-align: center; }
      #${PANEL_ID} .poe2fs-d-empty { padding: 24px 14px; color: #a89878; text-align: center; }
      #${PANEL_ID} .poe2fs-item {
        border: 1px solid #3a2f1e; border-radius: 4px; padding: 10px;
        margin-bottom: 8px; background: #1a1410;
      }
      #${PANEL_ID} .poe2fs-card-head {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px;
      }
      #${PANEL_ID} .poe2fs-title-wrap { display: flex; align-items: center; gap: 4px; min-width: 0; }
      #${PANEL_ID} .poe2fs-item h4 { margin: 0; font-size: 14px; color: #f0e6d2; word-break: break-word; }
      #${PANEL_ID} .poe2fs-edit {
        flex: none; background: none; border: none; cursor: pointer;
        font-size: 12px; line-height: 1; padding: 3px 4px; border-radius: 3px; opacity: .75;
      }
      #${PANEL_ID} .poe2fs-edit:hover { opacity: 1; background: #2a2016; }
      #${PANEL_ID} .poe2fs-item .poe2fs-meta { font-size: 12px; color: #a89878; margin-bottom: 6px; }
      #${PANEL_ID} .poe2fs-item .poe2fs-note { font-size: 12px; color: #c9b98a; font-style: italic; margin-bottom: 6px; word-break: break-word; }
      #${PANEL_ID} .poe2fs-item .poe2fs-badge {
        display: inline-block; font-size: 11px; color: #14100c; background: #c9a14a;
        border-radius: 3px; padding: 1px 6px; margin-left: 6px; font-style: normal;
      }
      #${PANEL_ID} .poe2fs-details { margin: 6px 0 2px; }
      #${PANEL_ID} .poe2fs-details > summary {
        cursor: pointer; user-select: none; list-style: none;
        display: flex; align-items: center; gap: 7px;
        color: #c9a14a; font-size: 12px; font-weight: 600;
        background: #201810; border: 1px solid #3a2f1e; border-radius: 3px;
        padding: 6px 9px;
      }
      #${PANEL_ID} .poe2fs-details > summary::-webkit-details-marker { display: none; }
      #${PANEL_ID} .poe2fs-details > summary::before {
        content: "▶"; font-size: 9px; color: #c9a14a;
        transition: transform .15s ease; transform: rotate(0deg);
      }
      #${PANEL_ID} .poe2fs-details[open] > summary::before { transform: rotate(90deg); }
      #${PANEL_ID} .poe2fs-details > summary:hover { background: #2a2016; border-color: #c9a14a; color: #dcb659; }
      #${PANEL_ID} .poe2fs-details > summary .poe2fs-sum-hint {
        margin-left: auto; font-weight: 400; font-size: 11px; color: #8a7a58;
      }
      #${PANEL_ID} .poe2fs-details[open] > summary .poe2fs-sum-hint::after { content: "Hide"; }
      #${PANEL_ID} .poe2fs-details:not([open]) > summary .poe2fs-sum-hint::after { content: "Show"; }
      #${PANEL_ID} .poe2fs-details-body { margin: 6px 0 2px; font-size: 12px; color: #d8ccb0; }
      #${PANEL_ID} .poe2fs-dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; }
      #${PANEL_ID} .poe2fs-dt { color: #a89878; }
      #${PANEL_ID} .poe2fs-dd { color: #f0e6d2; word-break: break-word; }
      #${PANEL_ID} .poe2fs-section { margin-top: 8px; }
      #${PANEL_ID} .poe2fs-stats { margin: 3px 0 0; padding-left: 16px; }
      #${PANEL_ID} .poe2fs-stats li { word-break: break-word; margin-bottom: 2px; }
      #${PANEL_ID} .poe2fs-empty2 { color: #a89878; font-style: italic; }
      #${PANEL_ID} .poe2fs-raw { margin-top: 8px; }
      #${PANEL_ID} .poe2fs-raw > summary { cursor: pointer; color: #a89878; font-size: 11px; }
      #${PANEL_ID} .poe2fs-raw pre {
        max-height: 220px; overflow: auto; margin: 6px 0 0;
        background: #0f0c08; border: 1px solid #3a2f1e; border-radius: 3px; padding: 8px;
        font: 11px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #cdbf9e; white-space: pre;
      }
      #${PANEL_ID} .poe2fs-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      #${PANEL_ID} .poe2fs-reload {
        flex: none; white-space: nowrap;
        font: 600 13px system-ui, sans-serif; color: #14100c; background: #c9a14a;
        border: none; border-radius: 3px; padding: 6px 12px; cursor: pointer;
      }
      #${PANEL_ID} .poe2fs-reload:hover { background: #dcb659; }
      #${PANEL_ID} .poe2fs-reload:disabled { opacity: .6; cursor: default; }
      #${PANEL_ID} .poe2fs-btn2 {
        font: 500 12px system-ui, sans-serif; color: #f0e6d2; background: transparent;
        border: 1px solid #3a2f1e; border-radius: 3px; padding: 5px 9px; cursor: pointer;
      }
      #${PANEL_ID} .poe2fs-btn2:hover { background: #2a2016; border-color: #c9a14a; }
      #${PANEL_ID} .poe2fs-btn2.poe2fs-danger:hover { background: #3a1414; border-color: #c95a4a; color: #f0c8c0; }

      /* Save dialog (lives outside the drawer panel, so it has its own rules). */
      .poe2fs-overlay {
        position: fixed; inset: 0; z-index: 2147483002;
        background: rgba(0,0,0,.55);
        display: flex; align-items: center; justify-content: center;
      }
      .poe2fs-dialog {
        width: 340px; max-width: 92vw; box-sizing: border-box;
        background: #14100c; color: #f0e6d2; border: 1px solid #c9a14a; border-radius: 5px;
        box-shadow: 0 8px 30px rgba(0,0,0,.6); padding: 16px;
        font: 14px/1.4 system-ui, sans-serif;
      }
      .poe2fs-dialog-title { font-weight: 700; color: #c9a14a; font-size: 15px; margin-bottom: 10px; }
      .poe2fs-label { display: block; font-size: 12px; color: #a89878; margin: 10px 0 4px; }
      .poe2fs-input, .poe2fs-select {
        width: 100%; box-sizing: border-box; background: #1a1410; color: #f0e6d2;
        border: 1px solid #3a2f1e; border-radius: 3px; padding: 7px 8px; font: 13px system-ui, sans-serif;
      }
      .poe2fs-input:focus, .poe2fs-select:focus { outline: none; border-color: #c9a14a; }
      .poe2fs-input:disabled { opacity: .45; }
      .poe2fs-dialog-hint { font-size: 11px; color: #8a7a58; margin-top: 8px; min-height: 14px; }
      .poe2fs-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
      .poe2fs-overlay .poe2fs-primary {
        font: 600 13px system-ui, sans-serif; color: #14100c; background: #c9a14a;
        border: none; border-radius: 3px; padding: 8px 16px; cursor: pointer;
      }
      .poe2fs-overlay .poe2fs-primary:hover { background: #dcb659; }
      .poe2fs-overlay .poe2fs-secondary {
        font: 500 13px system-ui, sans-serif; color: #f0e6d2; background: transparent;
        border: 1px solid #3a2f1e; border-radius: 3px; padding: 8px 14px; cursor: pointer;
      }
      .poe2fs-overlay .poe2fs-secondary:hover { background: #2a2016; border-color: #c9a14a; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    injectStyles();

    const closeBtn = el("button", { className: "poe2fs-d-close", title: "Close", textContent: "×" });
    closeBtn.addEventListener("click", close);

    const head = el("div", { className: "poe2fs-d-head" }, [
      el("span", { className: "poe2fs-d-title", textContent: "Saved filters" }),
      closeBtn,
    ]);

    const list = el("div", { className: "poe2fs-d-list" });

    // Footer: export / import backup.
    const exportBtn = el("button", { className: "poe2fs-btn2", type: "button", textContent: "⬇ Export" });
    exportBtn.title = "Download all saved filters as a JSON backup";
    exportBtn.addEventListener("click", exportBackup);

    const importBtn = el("button", { className: "poe2fs-btn2", type: "button", textContent: "⬆ Import" });
    importBtn.title = "Merge filters from a backup file (won't delete existing ones)";

    // Hidden file input drives the import; the visible button just opens it.
    const fileInput = el("input", { type: "file", accept: "application/json,.json" });
    fileInput.style.display = "none";
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = ""; // allow re-importing the same file later
      if (file) importBackup(file);
    });
    importBtn.addEventListener("click", () => fileInput.click());

    const foot = el("div", { className: "poe2fs-d-foot" }, [exportBtn, importBtn, fileInput]);

    panel = el("div", { id: PANEL_ID }, [head, list, foot]);
    document.body.appendChild(panel);
    return panel;
  }

  function currentLeague() {
    const m = window.location.pathname.match(/\/trade2\/search\/poe2\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ---- Manage: rename / note / delete (milestone 5) -------------------------
  // window.prompt/confirm are deliberate: minimal, dependency-free, and fine for
  // a personal tool. They can become inline fields later without changing storage.
  async function renameRecord(rec) {
    const store = window.PoE2FilterStore;
    if (!store) return;
    const next = window.prompt("Rename filter:", rec.title || "");
    if (next === null) return; // cancelled
    const title = next.trim();
    if (!title || title === rec.title) return;
    await store.update(rec.id, { title });
    refresh();
  }

  async function deleteRecord(rec) {
    const store = window.PoE2FilterStore;
    if (!store) return;
    if (!window.confirm(`Delete “${rec.title || "Untitled filter"}”? This can't be undone.`)) return;
    await store.remove(rec.id);
    // Keep the toolbar's "Saved (N)" badge in sync.
    const saver = window.PoE2FilterSaver;
    if (saver && typeof saver.refreshCount === "function") saver.refreshCount();
    refresh();
  }

  // ---- Save dialog: new filter, or overwrite an existing one ----------------
  const SAVE_OVERLAY_ID = "poe2fs-save-overlay";

  function closeSaveDialog() {
    const o = document.getElementById(SAVE_OVERLAY_ID);
    if (o) o.remove();
  }

  // capture = { query, sort, league }; suggestedTitle seeds the name field.
  async function openSaveDialog(capture, suggestedTitle) {
    const store = window.PoE2FilterStore;
    if (!store || !capture) return;
    closeSaveDialog();
    injectStyles();

    const records = await store.getAll();

    const nameInput = el("input", { className: "poe2fs-input", type: "text", value: suggestedTitle || "" });
    nameInput.placeholder = "Filter name";

    const select = el("select", { className: "poe2fs-select" });
    select.appendChild(el("option", { value: "", textContent: "— Save as a new filter —" }));
    for (const r of records) {
      const label = r.league ? `${r.title} — ${r.league}` : r.title || "Untitled filter";
      select.appendChild(el("option", { value: r.id, textContent: label }));
    }

    const hint = el("div", { className: "poe2fs-dialog-hint" });

    // Overwriting keeps the target's name/note, so the name field is only
    // relevant when saving as new — disable it while a target is selected.
    function syncMode() {
      const overwriting = !!select.value;
      nameInput.disabled = overwriting;
      if (overwriting) {
        const rec = records.find((r) => r.id === select.value);
        hint.textContent = `Overwrites “${rec ? rec.title : ""}” with the current search (keeps its name & note).`;
      } else {
        hint.textContent = "Saves the current search as a new filter.";
      }
    }
    select.addEventListener("change", syncMode);

    const saveBtn = el("button", { className: "poe2fs-primary", type: "button", textContent: "Save" });
    const cancelBtn = el("button", { className: "poe2fs-secondary", type: "button", textContent: "Cancel" });
    cancelBtn.addEventListener("click", closeSaveDialog);

    saveBtn.addEventListener("click", async () => {
      const overwriteId = select.value;
      try {
        if (overwriteId) {
          const rec = records.find((r) => r.id === overwriteId);
          await store.update(overwriteId, {
            query: capture.query,
            sort: capture.sort,
            league: capture.league,
            savedAt: Date.now(),
          });
          notify(`Updated “${rec ? rec.title : "filter"}” to the current search.`);
        } else {
          const title = (nameInput.value || "").trim() || suggestedTitle || "Untitled filter";
          await store.add({
            title,
            league: capture.league,
            query: capture.query,
            sort: capture.sort,
            note: "",
          });
          notify(`Saved “${title}”.`);
        }
        const saver = window.PoE2FilterSaver;
        if (saver && typeof saver.refreshCount === "function") saver.refreshCount();
        closeSaveDialog();
        if (isOpen()) refresh(); // reflect the change if the drawer is open
      } catch (err) {
        console.error("[PoE2 Filter Saver] save failed:", err);
        notify("Save failed — see console.");
      }
    });

    const dialog = el("div", { className: "poe2fs-dialog" }, [
      el("div", { className: "poe2fs-dialog-title", textContent: "Save filter" }),
      el("label", { className: "poe2fs-label", textContent: "Name" }),
      nameInput,
      el("label", { className: "poe2fs-label", textContent: "Overwrite existing (optional)" }),
      select,
      hint,
      el("div", { className: "poe2fs-dialog-actions" }, [cancelBtn, saveBtn]),
    ]);

    const overlay = el("div", { id: SAVE_OVERLAY_ID, className: "poe2fs-overlay" }, [dialog]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSaveDialog(); // click backdrop to dismiss
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSaveDialog();
      } else if (e.key === "Enter" && document.activeElement !== select) {
        e.preventDefault();
        saveBtn.click();
      }
    });

    document.body.appendChild(overlay);
    syncMode();
    nameInput.focus();
    if (nameInput.select) nameInput.select();
  }

  // ---- Backup: export / import (milestone 6) --------------------------------
  function notify(msg) {
    const saver = window.PoE2FilterSaver;
    if (saver && typeof saver.toast === "function") saver.toast(msg);
    else console.log("[PoE2 Filter Saver]", msg);
  }

  async function exportBackup() {
    const store = window.PoE2FilterStore;
    if (!store) return;
    const filters = await store.getAll();
    if (!filters.length) {
      notify("Nothing to export yet.");
      return;
    }
    const backup = store.buildBackup(filters);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const a = el("a", { href: url, download: `poe2-filters-${stamp}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the download a beat to start before revoking the URL.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify(`Exported ${filters.length} filter${filters.length === 1 ? "" : "s"}.`);
  }

  async function importBackup(file) {
    const store = window.PoE2FilterStore;
    if (!store) return;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      notify("Couldn't read that file.");
      console.warn("[PoE2 Filter Saver] import read failed:", err);
      return;
    }
    let filters;
    try {
      filters = store.parseBackup(text);
    } catch (err) {
      notify(`Import failed: ${err.message}`);
      return;
    }
    const { added, skipped } = await store.importMerge(filters);
    const saver = window.PoE2FilterSaver;
    if (saver && typeof saver.refreshCount === "function") saver.refreshCount();
    refresh();
    notify(`Imported ${added} new filter${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}.`);
  }

  // ---- Details panel: readable summary of a saved query ---------------------
  // Formats a { min, max, option } shaped filter into something readable.
  function fmtRange(o) {
    if (!o || typeof o !== "object") return null;
    const has = (k) => o[k] !== undefined && o[k] !== null && o[k] !== "";
    if (has("min") && has("max")) return `${o.min} – ${o.max}`;
    if (has("min")) return `≥ ${o.min}`;
    if (has("max")) return `≤ ${o.max}`;
    if (has("option")) return String(o.option);
    return null;
  }

  // Pull the human-interesting fields out of the saved query into label/value
  // rows. Defensive about missing keys — the trade query shape varies a lot.
  function describeRows(rec) {
    const q = rec.query || {};
    const f = q.filters || {};
    const rows = [];

    if (q.status && q.status.option) rows.push(["Status", q.status.option]);

    const tf = (f.type_filters && f.type_filters.filters) || {};
    if (tf.category && tf.category.option) rows.push(["Category", tf.category.option]);
    if (tf.rarity && tf.rarity.option) rows.push(["Rarity", tf.rarity.option]);

    const trade = (f.trade_filters && f.trade_filters.filters) || {};
    const price = fmtRange(trade.price);
    if (price) rows.push(["Price", price]);

    const req = (f.req_filters && f.req_filters.filters) || {};
    const lvl = fmtRange(req.lvl);
    if (lvl) rows.push(["Level req", lvl]);

    if (rec.sort && Object.keys(rec.sort).length) {
      rows.push(["Sort", Object.entries(rec.sort).map(([k, v]) => `${k} ${v}`).join(", ")]);
    }
    return rows;
  }

  // Flatten all stat filters (across and/or/not groups) into readable lines.
  function collectStats(rec) {
    const groups = (rec.query && rec.query.stats) || [];
    const out = [];
    for (const g of groups) {
      for (const sf of (g && g.filters) || []) {
        if (!sf) continue;
        out.push({ id: sf.id || "(unknown stat)", val: fmtRange(sf.value), disabled: !!sf.disabled });
      }
    }
    return out;
  }

  function buildDetails(rec) {
    const wrap = el("details", { className: "poe2fs-details" });
    wrap.appendChild(
      el("summary", {}, [
        el("span", { textContent: "Filter details" }),
        el("span", { className: "poe2fs-sum-hint" }), // ::after shows Show/Hide
      ])
    );
    const body = el("div", { className: "poe2fs-details-body" });

    const rows = describeRows(rec);
    if (rows.length) {
      const dl = el("div", { className: "poe2fs-dl" });
      for (const [label, value] of rows) {
        dl.appendChild(el("div", { className: "poe2fs-dt", textContent: label }));
        dl.appendChild(el("div", { className: "poe2fs-dd", textContent: value }));
      }
      body.appendChild(dl);
    }

    const stats = collectStats(rec);
    if (stats.length) {
      body.appendChild(el("div", { className: "poe2fs-dt poe2fs-section", textContent: `Stats (${stats.length})` }));
      const ul = el("ul", { className: "poe2fs-stats" });
      for (const s of stats) {
        const text = (s.val ? `${s.id} — ${s.val}` : s.id) + (s.disabled ? " (disabled)" : "");
        ul.appendChild(el("li", { textContent: text }));
      }
      body.appendChild(ul);
    }

    if (!rows.length && !stats.length) {
      body.appendChild(el("div", { className: "poe2fs-empty2", textContent: "No readable details for this filter." }));
    }

    // Raw JSON for anyone who wants the exact stored payload.
    const raw = el("details", { className: "poe2fs-raw" });
    raw.appendChild(el("summary", { textContent: "Raw JSON" }));
    raw.appendChild(el("pre", { textContent: JSON.stringify({ query: rec.query, sort: rec.sort }, null, 2) }));
    body.appendChild(raw);

    wrap.appendChild(body);
    return wrap;
  }

  async function refresh() {
    const panel = ensurePanel();
    const list = panel.querySelector(".poe2fs-d-list");
    const store = window.PoE2FilterStore;
    const records = store ? await store.getAll() : [];
    const league = currentLeague();

    list.textContent = "";

    if (!records.length) {
      list.appendChild(
        el("div", {
          className: "poe2fs-d-empty",
          textContent: "No saved filters yet. Run a search and click “💾 Save filter”.",
        })
      );
      return;
    }

    for (const rec of records) {
      const reloadBtn = el("button", { className: "poe2fs-reload", type: "button", textContent: "Reload" });
      reloadBtn.addEventListener("click", async () => {
        const saver = window.PoE2FilterSaver;
        if (!saver || typeof saver.reload !== "function") return;
        reloadBtn.disabled = true;
        reloadBtn.textContent = "Reloading…";
        await saver.reload(rec); // navigates on success; on failure we re-enable
        reloadBtn.disabled = false;
        reloadBtn.textContent = "Reload";
      });

      // Rename is now a pencil icon sitting next to the filter name.
      const editBtn = el("button", { className: "poe2fs-edit", type: "button", textContent: "✏️" });
      editBtn.title = "Rename filter";
      editBtn.setAttribute("aria-label", "Rename filter");
      editBtn.addEventListener("click", () => renameRecord(rec));

      const deleteBtn = el("button", { className: "poe2fs-btn2 poe2fs-danger", type: "button", textContent: "Delete" });
      deleteBtn.addEventListener("click", () => deleteRecord(rec));

      // If the saved filter is for a different league than the page, flag it —
      // reload will still work but takes you to that league's search.
      const otherLeague = rec.league && league && rec.league !== league;
      const metaText = `${rec.league || "?"} · ${fmtDate(rec.savedAt)}`;

      // Header: title + rename pencil on the left, Reload pinned top-right.
      const titleWrap = el("div", { className: "poe2fs-title-wrap" }, [
        el("h4", {}, [
          rec.title || "Untitled filter",
          otherLeague ? el("span", { className: "poe2fs-badge", textContent: "other league" }) : null,
        ]),
        editBtn,
      ]);
      const header = el("div", { className: "poe2fs-card-head" }, [titleWrap, reloadBtn]);

      const item = el("div", { className: "poe2fs-item" }, [
        header,
        el("div", { className: "poe2fs-meta", textContent: metaText }),
        rec.note ? el("div", { className: "poe2fs-note", textContent: rec.note }) : null,
        buildDetails(rec),
        el("div", { className: "poe2fs-actions" }, [deleteBtn]),
      ]);
      list.appendChild(item);
    }
  }

  function open() {
    const panel = ensurePanel();
    refresh();
    // rAF so the transform transition runs from the off-canvas state.
    requestAnimationFrame(() => panel.classList.add("open"));
  }
  function close() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.classList.remove("open");
  }
  function isOpen() {
    const panel = document.getElementById(PANEL_ID);
    return !!(panel && panel.classList.contains("open"));
  }
  function toggle() {
    isOpen() ? close() : open();
  }

  window.PoE2Drawer = { open, close, toggle, refresh, isOpen, openSaveDialog };
})();
