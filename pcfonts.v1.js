/*!
 * pcfonts.v1.js - pick a font installed on this PC from a list (no dependencies)
 *
 * Same file in status-bar-maker, chat-window-maker and foreground-frame-maker.
 *
 * Markup:
 *   <span class="pc-font"><input type="text" data-bind="..."><button type="button" data-pc-fonts>一覧から選ぶ</button></span>
 * The picked family name is written into the input, followed by "input" and "change" events,
 * so the page's own binding stores it, records undo and redraws.
 *
 * window.queryLocalFonts() (Local Font Access API) exists only in Chrome / Edge 103+ on desktop.
 * It must be called from a click, and the browser asks for the "local-fonts" permission the
 * first time. Where it is missing the buttons stay hidden and the name can still be typed.
 */
(function () {
  "use strict";

  const supported = typeof window.queryLocalFonts === "function";
  const SAMPLE = "あいう アイウ 永 Abc 123";

  const STYLE = `
  .pc-font { display: flex; gap: 6px; align-items: center; min-width: 0; }
  .pc-font > input { flex: 1; min-width: 0; }
  .pc-font > button { flex: none; white-space: nowrap; }
  .pcf-dialog { width: min(560px, calc(100vw - 32px)); height: min(680px, calc(100vh - 48px)); padding: 0;
    background: var(--panel, #1e1f26); color: var(--fg, #e7e7ea); border: 1px solid var(--line, #303240); border-radius: 10px; }
  .pcf-dialog::backdrop { background: rgba(0, 0, 0, 0.55); }
  .pcf-dialog[open] { display: flex; flex-direction: column; }
  .pcf-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px 0; }
  .pcf-head h2 { margin: 0; font-size: 15px; }
  .pcf-tools { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; padding: 12px 16px 0; }
  .pcf-msg { margin: 8px 16px 0; min-height: 1.5em; color: var(--muted, #9a9aa5); font-size: 12px; line-height: 1.6; }
  .pcf-msg.error { color: #ff8a8a; }
  .pcf-list { position: relative; flex: 1; overflow-y: auto; margin: 6px 0 0; padding: 0 8px; border-top: 1px solid var(--line-soft, #282a36); }
  .pcf-list button.pcf-item { display: block; width: 100%; margin: 0; padding: 7px 8px; text-align: left; background: transparent;
    border: 0; border-bottom: 1px solid var(--line-soft, #282a36); border-radius: 0;
    content-visibility: auto; contain-intrinsic-size: auto 58px; }
  .pcf-list button.pcf-item:hover { background: #2a2c38; }
  .pcf-list button.pcf-item[aria-current=true] { background: #2c2e4a; box-shadow: inset 3px 0 0 var(--accent, #6b70ff); }
  .pcf-name { display: block; color: var(--muted, #9a9aa5); font-size: 11px; }
  .pcf-sample { display: block; font-size: 22px; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pcf-note { margin: 0; padding: 10px 16px 14px; border-top: 1px solid var(--line-soft, #282a36);
    color: var(--muted, #9a9aa5); font-size: 12px; line-height: 1.6; }
  .pcf-note b { color: var(--fg, #e7e7ea); }
  `;

  let fonts = null;      // [{ family, search }] sorted by family
  let loading = null;    // Promise while queryLocalFonts() runs
  let dialog = null, ui = null, target = null;

  const cssFamily = name => `"${name.replace(/["\\]/g, "\\$&")}", sans-serif`;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function build() {
    if (dialog) return;
    ui = {
      close: el("button", { type: "button", class: "small", text: "閉じる" }),
      search: el("input", { type: "search", placeholder: "名前で絞り込む（例: gothic）", "aria-label": "フォント名で絞り込む", autocomplete: "off", spellcheck: "false" }),
      sample: el("input", { type: "text", value: SAMPLE, "aria-label": "見本の文字" }),
      msg: el("p", { class: "pcf-msg", role: "status" }),
      list: el("div", { class: "pcf-list" }),
    };
    dialog = el("dialog", { class: "pcf-dialog", "aria-labelledby": "pcfTitle" }, [
      el("div", { class: "pcf-head" }, [el("h2", { id: "pcfTitle", text: "PC のフォントから選ぶ" }), ui.close]),
      el("div", { class: "pcf-tools" }, [ui.search, ui.sample]),
      ui.msg,
      ui.list,
      el("p", { class: "pcf-note" }, [
        "名前はそのフォントの見た目で表示しています。",
        el("b", { text: "OBS を動かす PC にも、同じフォントが入っている必要があります。" }),
      ]),
    ]);
    document.body.append(dialog);

    // Keep keys inside: the pages' own shortcuts (Ctrl+Z = undo) listen on document.
    dialog.addEventListener("keydown", ev => ev.stopPropagation());
    ui.close.addEventListener("click", () => dialog.close());
    ui.search.addEventListener("input", filter);
    ui.search.addEventListener("keydown", ev => {
      if (ev.key !== "Enter" || ev.isComposing) return;
      ev.preventDefault();
      const first = ui.list.querySelector(".pcf-item:not([hidden])");
      if (first) choose(first.dataset.family);
    });
    ui.sample.addEventListener("input", () => {
      const text = ui.sample.value || SAMPLE;
      for (const node of ui.list.querySelectorAll(".pcf-sample")) node.textContent = text;
    });
    ui.list.addEventListener("click", ev => {
      const item = ev.target.closest(".pcf-item");
      if (item) choose(item.dataset.family);
    });
  }

  function message(text, isError) {
    ui.msg.textContent = text;
    ui.msg.classList.toggle("error", !!isError);
  }

  // Must run inside the click handler: queryLocalFonts() needs the user's click.
  function load() {
    if (!loading) {
      loading = window.queryLocalFonts().then(list => {
        const map = new Map();
        for (const f of list) {
          if (!f.family) continue;
          if (!map.has(f.family)) map.set(f.family, new Set([f.family]));
          map.get(f.family).add(f.fullName);
        }
        // Some browsers answer a refused permission with an empty list instead of an error.
        if (!map.size) throw new DOMException("No fonts", "NotFoundError");
        fonts = [...map].map(([family, names]) => ({ family, search: [...names].join("\n").toLowerCase() }))
          .sort((a, b) => a.family.localeCompare(b.family, "ja"));
      });
      // A refusal can be undone in the site settings; let the next click try again.
      loading.catch(() => { loading = null; });
    }
    return loading;
  }

  function renderList() {
    const text = ui.sample.value || SAMPLE;
    ui.list.replaceChildren(...fonts.map(f => {
      const sample = el("span", { class: "pcf-sample", text });
      sample.style.fontFamily = cssFamily(f.family);
      return el("button", { type: "button", class: "pcf-item", "data-family": f.family }, [
        el("span", { class: "pcf-name", text: f.family }), sample,
      ]);
    }));
  }

  function filter() {
    if (!fonts) return;
    const words = ui.search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    ui.list.querySelectorAll(".pcf-item").forEach((item, i) => {
      const hit = words.every(w => fonts[i].search.includes(w));
      item.hidden = !hit;
      if (hit) shown++;
    });
    message(words.length ? `${fonts.length} 個のうち ${shown} 個` : `${fonts.length} 個のフォント。クリックで選べます。`);
  }

  function markCurrent() {
    const current = target ? target.value.trim() : "";
    let hit = null;
    for (const item of ui.list.querySelectorAll(".pcf-item")) {
      const on = item.dataset.family === current;
      item.setAttribute("aria-current", String(on));
      if (on) hit = item;
    }
    // Scroll only the list (scrollIntoView could move the page behind the dialog).
    ui.list.scrollTop = hit ? hit.offsetTop - (ui.list.clientHeight - hit.offsetHeight) / 2 : 0;
  }

  function choose(family) {
    if (target) {
      target.value = family;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
    dialog.close();
  }

  function open(input) {
    build();
    target = input;
    ui.search.value = "";
    if (!dialog.open) dialog.showModal();
    if (fonts) {
      filter();
      markCurrent();
      ui.search.focus();
      return;
    }
    ui.list.replaceChildren();
    message("PC のフォントを読み込んでいます…　ブラウザに「フォントの使用」の許可を聞かれたら「許可」を押してください。");
    load().then(() => {
      renderList();
      filter();
      markCurrent();
      ui.search.focus();
    }, err => {
      const refused = err && (err.name === "NotAllowedError" || err.name === "NotFoundError");
      message(refused
        ? "フォントの一覧を読み込めませんでした。フォントの使用が許可されていない可能性があります。アドレスバー左のアイコン →「サイトの設定」で「フォント」を「許可」にしてから、もう一度開いてください。フォント名を直接入力しても使えます。"
        : "このページではフォントの一覧を読み込めませんでした（ファイルを直接開いたときなど）。フォント名を直接入力してください。", true);
    });
  }

  document.head.append(el("style", { text: STYLE }));
  for (const btn of document.querySelectorAll("[data-pc-fonts]")) {
    const input = btn.closest(".pc-font")?.querySelector("input");
    btn.hidden = !supported || !input;
    btn.addEventListener("click", () => open(input));
  }

  window.PcFonts = { supported, open };
})();
