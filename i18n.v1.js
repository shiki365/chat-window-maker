/*!
 * i18n.v1.js - Japanese / English / Korean for the shiki365 tools (no dependencies)
 *
 * Same file in every tool and on the hub page. Load it in <head>, before the dictionaries:
 *   <html lang="ja" data-langs="ja en ko">
 *   <script src="i18n.v1.js"></script>
 *   <script src="lang.en.v1.js"></script>   ->  I18n.add("en", { "日本語の文": "English", ... })
 *   <script src="lang.ko.v1.js"></script>
 *
 * The page is written in Japanese and the Japanese text itself is the key (gettext style),
 * so the markup needs no ids. Keys are compared with runs of white space folded to one space.
 *   - Every text node and the attributes placeholder / title / aria-label / alt / label
 *     whose text is a key are replaced once the document has loaded.
 *   - An element with data-i18n is replaced as a whole (its innerHTML is the key), for
 *     sentences with links or <code> inside. Dictionaries are part of the tool, never user input.
 *   - data-lang-only="en ko" shows an element only in those languages.
 *   - Text made by scripts goes through I18n.t("日本語の文", { n: 3 }); "{n}" in the
 *     text and in the translation is replaced by the value.
 *   - [data-lang-switch] gets links to the other languages.
 *
 * The language is ?lang=xx, then the last choice (localStorage, shared by every page on
 * shiki365.github.io), then the browser's languages; anything else falls back to English.
 * A language the page does not list in data-langs falls back to Japanese.
 * Switching reloads the page with ?lang=xx, so nothing has to be translated back.
 */
(function () {
  "use strict";

  const NAMES = { ja: "日本語", en: "English", ko: "한국어" };
  const STORE = "shiki365.lang";
  const FEEDBACK = "https://shiki365.github.io/#contact";
  const ATTRS = ["placeholder", "title", "aria-label", "alt", "label"];
  const root = document.documentElement;
  const offered = (root.getAttribute("data-langs") || "ja").split(/\s+/).filter(code => NAMES[code]);

  const norm = text => String(text).replace(/\s+/g, " ").trim();
  // Kana, kanji, Japanese punctuation (、。「」…) and full-width signs, except the dice bot's ＜ ＞,
  // which stay as they are in every language ("＞ 9" is not a text to translate).
  const hasJapanese = text => /[、-ヿ㐀-鿿！-；＝？-｠]/.test(text);

  function remember(code) {
    try { localStorage.setItem(STORE, code); } catch (err) { /* storage may be blocked */ }
  }

  function detect() {
    let asked = null;
    try { asked = new URLSearchParams(location.search).get("lang"); } catch (err) { /* old browser */ }
    if (NAMES[asked]) { remember(asked); return asked; }
    try {
      const saved = localStorage.getItem(STORE);
      if (NAMES[saved]) return saved;
    } catch (err) { /* storage may be blocked */ }
    // Japanese or Korean anywhere in the list wins; a browser set to neither gets English.
    for (const tag of navigator.languages || [navigator.language || ""]) {
      const code = String(tag).toLowerCase().slice(0, 2);
      if (code === "ja" || code === "ko") return code;
    }
    return "en";
  }

  const wanted = detect();
  const lang = offered.includes(wanted) ? wanted : "ja";
  const dict = {};
  const missing = new Set();
  root.lang = lang;

  // Elements for other languages are hidden by CSS from the start (no flash, and stronger than
  // a page rule such as display: inline-block). The Japanese page waits hidden until translated.
  const style = document.createElement("style");
  style.textContent = '[data-lang-only]:not([data-lang-only~="' + lang + '"]) { display: none !important; }'
    + " html.i18n-wait body { visibility: hidden; }";
  document.head.append(style);
  if (lang !== "ja") {
    root.classList.add("i18n-wait");
    setTimeout(() => root.classList.remove("i18n-wait"), 3000);
  }

  function add(code, entries) {
    const table = dict[code] || (dict[code] = new Map());
    for (const [key, value] of Object.entries(entries)) table.set(norm(key), value);
  }

  /** The translation of a Japanese key, or null. Misses are kept in I18n.missing for checking. */
  function lookup(key) {
    if (lang === "ja") return null;
    const k = norm(key);
    if (!hasJapanese(k)) return null;                 // e.g. "SYSTEM REBOOT": nothing to translate
    const hit = dict[lang] && dict[lang].get(k);
    if (hit == null) { missing.add(k); return null; }
    return hit;
  }

  function fill(text, vars) {
    return vars ? text.replace(/\{(\w+)\}/g, (all, name) => (name in vars ? String(vars[name]) : all)) : text;
  }

  function t(key, vars) {
    const hit = lookup(key);
    return fill(hit == null ? key : hit, vars);
  }

  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

  function apply(scope) {
    const base = scope || document.body;
    if (lang !== "ja") {
      for (const node of base.querySelectorAll("[data-i18n]")) {
        const hit = lookup(node.innerHTML);
        if (hit != null) node.innerHTML = hit;
      }
      const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          for (let p = node.parentElement; p && p !== base.parentElement; p = p.parentElement) {
            if (SKIP.has(p.tagName) || p.hasAttribute("data-i18n") || p.getAttribute("translate") === "no") {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return hasJapanese(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const hit = lookup(node.nodeValue);
        if (hit == null) continue;
        // Keep the white space around the text, which spaces it from its neighbours.
        const [, before, , after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(node.nodeValue);
        node.nodeValue = before + hit + after;
      }
      for (const name of ATTRS) {
        for (const node of base.querySelectorAll("[" + name + "]")) {
          const value = node.getAttribute(name);
          if (!hasJapanese(value)) continue;
          const hit = lookup(value);
          if (hit != null) node.setAttribute(name, hit);
        }
      }
    }
  }

  function linkTo(code) {
    const url = new URL(location.href);
    url.searchParams.set("lang", code);
    return url.pathname + url.search + url.hash;
  }

  function buildSwitches() {
    for (const box of document.querySelectorAll("[data-lang-switch]")) {
      box.replaceChildren();
      box.setAttribute("role", "navigation");
      box.setAttribute("aria-label", "Language / 言語 / 언어");
      offered.forEach((code, i) => {
        if (i) box.append(" / ");
        const link = document.createElement("a");
        link.textContent = NAMES[code];
        link.lang = code;
        link.hreflang = code;
        link.href = linkTo(code);
        if (code === lang) link.setAttribute("aria-current", "true");
        // Remember the choice before the page reloads, also when the address bar is edited later.
        link.addEventListener("click", () => remember(code));
        box.append(link);
      });
      if (lang !== "ja") {
        const note = document.createElement("a");
        note.className = "lang-feedback";
        note.href = FEEDBACK;
        note.textContent = t("訳の誤りを知らせる");
        box.append(" / ", note);
      }
    }
  }

  function start() {
    const title = lookup(document.title);
    if (title != null) document.title = title;
    apply(document.body);
    buildSwitches();
    root.classList.remove("i18n-wait");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.I18n = { lang, languages: offered, add, t, apply, missing };
})();
