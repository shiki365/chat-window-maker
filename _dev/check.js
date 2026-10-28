#!/usr/bin/env node
/*
 * _dev/check.js - checks to run before publishing チャットウィンドウメーカー (chat-window-maker)
 *
 * Not part of the tool: GitHub Pages (Jekyll) does not publish folders whose name starts with "_".
 * Needs Node 18 or later and nothing else. Checks 4 and 5 need Chromium through Playwright
 * (Node 20 or later; cd _dev && npm install); without it they are skipped, and the summary says so.
 *
 *   node _dev/check.js              run everything; exit code 1 if anything fails
 *   node _dev/check.js --update     rewrite _dev/snapshots/ after an intended change of the CSS
 *   node _dev/check.js --help       all options
 *
 *   1 generate   the tool's scripts run in node:vm with a stub window, in index.html's order, and
 *                build the CSS of every design and of N random settings (seeded, so repeatable)
 *                in every language of the page
 *   2 strings    no "undefined", "NaN", "[object Object]" or unreplaced "{name}" in the CSS; the
 *                texts the CSS uses are translated and keep their {name} placeholders
 *   3 injection  text typed into a field (title, font name...) stays inside a CSS string or comment:
 *                the CSS has the same tokens as with a plain value
 *   4 syntax     the browser (CSSStyleSheet.replaceSync) reads every rule and declaration written
 *   5 page       index.html in every language at every width: no console errors, no horizontal
 *                overflow (every tab, <details> open), I18n.missing empty
 *   6 snapshots  the Japanese CSS of every design is byte for byte the one in _dev/snapshots/
 *
 * Moving this to another tool of the same kind: change CONFIG below, and nothing else.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const http = require("http");

const CONFIG = {
  name: "チャットウィンドウメーカー",
  // Scripts of index.html that run without a DOM, named without ".vN.js"; index.html sets their order.
  nodeScripts: ["i18n", "lang.en", "lang.ko", "presets", "model", "css"],

  // The CSS the tool writes out, from the globals those scripts set (w: the scripts' window).
  designs: w => Object.keys(w.ChatPresets.DESIGNS),
  defaultState: w => w.ChatModel.defaultState(),
  designState: (w, key) => {
    const state = w.ChatModel.defaultState();
    w.ChatModel.applyDesign(state, key);
    return state;
  },
  // Random settings go through the same normalize() as an opened project file.
  normalize: (w, state) => w.ChatModel.normalize(state),
  build: (w, state) => w.ChatCss.build(state, { url: w.ChatModel.chatUrl(state.source.room) }),
  // The list behind <select data-options="NAME">: [[value, label], ...] or { value: { label } }.
  options: (w, name) => w.ChatPresets[name],

  // data-bind controls that never reach the CSS.
  ignoreControls: ["preview.tab", "fileBase"],
  // What app.v1.js changes along with a control: scrolling sets one message in a fixed window.
  couple: (state, rnd) => {
    if (state.motion.scroll && rnd() < 0.7) {
      state.list.count = 1;
      state.panel.mode = "fixed";
    }
  },
  // Settings under which each text field of index.html reaches the CSS. A text field missing here,
  // or one that never shows up in the CSS under its settings, fails check 3.
  textFields: {
    "title.text": [{ "title.source": "text" }, { "title.source": "textTab" }],
    "title.fontName": [{ "title.source": "text", "title.font": "pc" }, { "title.source": "tab", "title.font": "pc" }],
    "members.label": [{ "members.show": true, "title.source": "text" }, { "members.show": true, "title.source": "tab" }],
    "name.fontName": [{ "name.show": true, "name.font": "pc" }],
    "text.fontName": [{ "text.font": "pc" }],
    "result.fontName": [{ "result.font": "pc" }],
    "source.room": [{}],
  },

  page: {
    widths: [1280, 375],
    height: 900,
    tabs: "[data-tab]",
    // Rows shown only under some settings; also checked for overflow with all of them shown.
    conditional: "[data-show]",
    // The functions below run in the page.
    ready: () => document.querySelector("#cssOut").value.length > 0,
    // The CSS shown right after loading, which must equal CONFIG.build(defaultState) in Node.
    cssOut: () => document.querySelector("#cssOut").value,
    // Runs more of the UI's texts through I18n.t: I18n.missing only records texts that were looked up.
    exercise: async () => {
      const $ = sel => document.querySelector(sel);
      const frame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const pick = (select, value) => {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };
      for (const option of [...$("#design").options]) {
        pick($("#design"), option.value);
        $("#applyDesign").click();
        await frame();
      }
      for (const option of [...$("#previewTab").options]) {
        pick($("#previewTab"), option.value);
        for (const button of document.querySelectorAll("[data-send]")) {
          button.click();
          await frame();
        }
      }
      $("#sendCustom").click();
      $('[data-bind="motion.scroll"]').click();
      await frame();
      $("#resetMessages").click();
      await frame();
    },
  },
};

// Random values for text fields: no "undefined" / "NaN" / "{name}", which check 2 looks for.
const TEXT_POOL = [
  "", "DICE ROLL", "探索記録", "SECRET // ", "宛先", "BIZ UDPGothic", "Yu Gothic UI", "源ノ角ゴシック JP",
  'Font "Quoted"', "back\\slash", "emoji 🎲🎲", "  spaces around  ", "a/*b", "x*/y",
  "https://ccfolia.com/rooms/AbCd1234_-x", "AbCd1234",
];

// Check 3: each payload follows MARKER, and the CSS must keep the tokens it has with MARKER alone.
const MARKER = "Zq9Mark";
const PAYLOADS = [
  "*/ body{display:none} /*",
  '"; } body{display:none} x{content:"',
  "'; } body{display:none} x{content:'",
  '\\"; } body{display:none}',
  "\\",
  "\n} body{display:none}\n",
  "</style><style>body{display:none}",
];

const BAD_WORDS = [/undefined/, /NaN/, /\[object Object\]/, /\{[A-Za-z_]\w*\}/];
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
const MAX_LINES = 15;

// An expected stop (a wrong option...): the message is enough, without a stack trace.
class Stop extends Error {}

// ---------------------------------------------------------------- options

const HELP = `使い方: node _dev/check.js [オプション]

  --update            _dev/snapshots/ を今の出力で書き直す（CSS を意図して変えたとき）
  --no-browser        ブラウザを使う 4・5 を飛ばす
  --require-browser   ブラウザが無いとき、飛ばさずに失敗にする
  --seed=N            乱数の設定のシード（既定 20260924）
  --cases=N           乱数の設定の数（既定 100）
  --root=DIR          ツールのフォルダ（既定: _dev の一つ上）。壊した一時コピーを調べるとき用
  --dump=ID           ID の設定と CSS を出して終わる（例: ja:random:17、ja:design:dicebox）
  --help              これを出す`;

function parseArgs(argv) {
  const opts = { update: false, browser: true, requireBrowser: false, seed: 20260924, cases: 100,
    root: path.resolve(__dirname, ".."), dump: null, help: false };
  const int = (key, value) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) throw new Stop(`${key} には 0 以上の整数を書いてください: ${value}`);
    return n;
  };
  for (const arg of argv) {
    const [key, value] = arg.split(/=(.*)/s);
    if (key === "--update") opts.update = true;
    else if (key === "--no-browser") opts.browser = false;
    else if (key === "--require-browser") opts.requireBrowser = true;
    else if (key === "--seed") opts.seed = int(key, value);
    else if (key === "--cases") opts.cases = int(key, value);
    else if (key === "--root") opts.root = path.resolve(value || ".");
    else if (key === "--dump") opts.dump = value;
    else if (key === "--help" || key === "-h") opts.help = true;
    else throw new Stop(`知らないオプションです: ${arg}（--help で一覧）`);
  }
  return opts;
}

// ---------------------------------------------------------------- report

class Section {
  constructor(no, title, unit = "本") {
    Object.assign(this, { no, title, unit, status: "ok", summary: "", lines: [], groups: new Map() });
  }
  fail(line) {
    this.status = "fail";
    if (line) this.lines.push(line);
  }
  // One line for a failure that many CSS files share, with how many and an example.
  group(key, id, example) {
    let g = this.groups.get(key);
    if (!g) {
      g = { key, ids: [], example };
      this.groups.set(key, g);
      this.fail(g);
    }
    if (!g.ids.includes(id)) g.ids.push(id);
  }
  skip(reason) {
    if (this.status !== "fail") this.status = "skip";
    this.summary = reason;
  }
  print() {
    const mark = { ok: "OK ", fail: "NG ", skip: "飛ばした" }[this.status];
    const failures = this.lines.length ? `${this.lines.length} 件` : "";
    console.log(`[${this.no}] ${mark}  ${this.title}${this.summary || failures ? ": " : ""}${[failures, this.summary].filter(Boolean).join("。")}`);
    const text = line => (typeof line === "string" ? line
      : `${line.key}（${line.ids.length} ${this.unit}: ${line.ids.slice(0, 3).join(", ")}${line.ids.length > 3 ? " …" : ""}）`
        + (line.example ? `\n  例: ${line.example}` : ""));
    for (const line of this.lines.slice(0, MAX_LINES)) console.log(indent(text(line), "      "));
    if (this.lines.length > MAX_LINES) console.log(`      …ほか ${this.lines.length - MAX_LINES} 件`);
  }
}

const indent = (text, pad) => String(text).split("\n").map(l => pad + l).join("\n");
const short = (text, n = 90) => {
  const s = JSON.stringify(String(text));
  return s.length > n ? s.slice(0, n - 2) + "…\"" : s;
};
const lineAt = (text, index) => text.slice(0, index).split("\n").length;
const lineText = (text, no) => text.split("\n")[no - 1];

// ---------------------------------------------------------------- the tool's scripts in node:vm

function readTool(root) {
  const file = path.join(root, "index.html");
  if (!fs.existsSync(file)) throw new Stop(`index.html がありません: ${file}`);
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => {
    const src = m[1].split(/[?#]/)[0];
    return { src, name: path.basename(src).replace(/\.v\d+\.js$/, "") };
  });
  const langs = ((html.match(/<html\b[^>]*\bdata-langs="([^"]*)"/) || [])[1] || "ja").split(/\s+/).filter(Boolean);
  return { root, html, scripts, langs, controls: parseControls(html) };
}

function parseAttrs(text) {
  const attrs = {};
  for (const m of text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[m[1]] = m[2] === undefined ? "" : m[2];
  return attrs;
}

function parseControls(html) {
  const list = [];
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const a = parseAttrs(m[2]);
    if (!a["data-bind"]) continue;
    list.push({ path: a["data-bind"], type: m[1] === "input" ? a.type || "text" : m[1], min: a.min, max: a.max, step: a.step,
      options: a["data-options"], number: "data-number" in a });
  }
  return list;
}

// Just enough of window / document for i18n.v1.js; it waits for DOMContentLoaded, which never comes.
function stubWindow(langs, lang) {
  const noop = () => {};
  const store = new Map();
  const root = { lang: "", classList: { add: noop, remove: noop }, getAttribute: name => (name === "data-langs" ? langs.join(" ") : null) };
  const document = {
    documentElement: root, head: { append: noop }, body: null, title: "", readyState: "loading",
    addEventListener: noop, createElement: () => ({ textContent: "", setAttribute: noop }),
    querySelector: () => null, querySelectorAll: () => [],
  };
  const win = {
    document, console, URL, URLSearchParams, setTimeout: () => 0, clearTimeout: noop,
    location: { search: `?lang=${lang}`, href: `http://localhost/index.html?lang=${lang}`, pathname: "/index.html", hash: "" },
    navigator: { language: lang, languages: [lang] },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  };
  win.window = win;
  win.self = win;
  return win;
}

function loadScripts(tool, lang) {
  for (const name of CONFIG.nodeScripts) {
    if (!tool.scripts.some(s => s.name === name)) throw new Error(`index.html に ${name}.vN.js の <script> がありません`);
  }
  const win = vm.createContext(stubWindow(tool.langs, lang));
  for (const s of tool.scripts) {
    if (!CONFIG.nodeScripts.includes(s.name)) continue;
    vm.runInContext(fs.readFileSync(path.join(tool.root, s.src), "utf8"), win, { filename: s.src });
  }
  if (win.I18n && win.I18n.lang !== lang) throw new Error(`?lang=${lang} にしたのに I18n.lang が ${win.I18n.lang} です`);
  // Remember the texts the CSS looks up, to check their translations.
  win.usedTexts = new Set();
  if (win.I18n) {
    const t = win.I18n.t;
    win.I18n.t = (text, vars) => {
      win.usedTexts.add(text);
      return t(text, vars);
    };
    win.I18n.translate = t;
  }
  return win;
}

// ---------------------------------------------------------------- random settings

// FNV-1a of the key, then mulberry32: every (seed, case, control) has its own stream, so adding
// a control to index.html does not change the values of the others.
function rng(key) {
  let h = 2166136261;
  for (const ch of String(key)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const choose = (list, r) => list[Math.floor(r() * list.length)];

function randomValue(win, control, r) {
  switch (control.type) {
    case "checkbox": return r() < 0.5;
    case "color": return "#" + Math.floor(r() * 0x1000000).toString(16).padStart(6, "0");
    case "range":
    case "number": {
      const min = Number(control.min), max = Number(control.max), step = Number(control.step) || 1;
      if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
      const steps = Math.floor((max - min) / step + 1e-9), roll = r();
      const i = roll < 0.2 ? 0 : roll < 0.4 ? steps : Math.floor(r() * (steps + 1));
      const decimals = (String(control.step || "").split(".")[1] || "").length;
      return Number((min + i * step).toFixed(decimals));
    }
    case "text": return choose(TEXT_POOL, r);
    case "select": {
      const list = control.options && CONFIG.options(win, control.options);
      if (!list) return undefined;
      const value = choose(Array.isArray(list) ? list.map(entry => entry[0]) : Object.keys(list), r);
      return control.number ? Number(value) : value;
    }
    default: return undefined;
  }
}

function setPath(obj, dotted, value) {
  const keys = dotted.split(".");
  const last = keys.pop();
  for (const key of keys) {
    if (obj[key] === null || typeof obj[key] !== "object") return false;
    obj = obj[key];
  }
  obj[last] = value;
  return true;
}

function randomState(win, tool, seed, index) {
  const rnd = rng(`${seed}:${index}`);
  const state = CONFIG.designState(win, choose(CONFIG.designs(win), rnd));
  for (const control of tool.controls) {
    if (CONFIG.ignoreControls.includes(control.path)) continue;
    const r = rng(`${seed}:${index}:${control.path}`);
    if (r() < 0.5) continue;
    const value = randomValue(win, control, r);
    if (value !== undefined) setPath(state, control.path, value);
  }
  CONFIG.couple(state, rnd);
  return CONFIG.normalize(win, state);
}

// ---------------------------------------------------------------- CSS tokens (CSS Syntax Level 3)

// Enough of the tokenizer to see structure: comments, strings (escapes, bad strings), url(),
// blocks and separators. Everything else becomes "chunk" runs (idents, numbers, @keywords...).
const WS = new Set([" ", "\t", "\n", "\r", "\f"]);
const NEWLINE = new Set(["\n", "\r", "\f"]);
const PUNCT = new Set(["{", "}", "(", ")", "[", "]", ";", ":", ","]);
const CLOSE = { "{": "}", "(": ")", "[": "]" };
const HEX = /[0-9a-fA-F]/;

function escapeEnd(css, i) {
  let j = i + 1;
  if (!HEX.test(css[j] || "")) return Math.min(css.length, j + 1);
  for (let k = 0; k < 6 && HEX.test(css[j] || ""); k++) j++;
  if (css[j] === "\r" && css[j + 1] === "\n") return j + 2;
  return WS.has(css[j]) ? j + 1 : j;
}

function tokenize(css) {
  const out = [];
  const n = css.length;
  let i = 0;
  const push = (type, start) => out.push({ type, start, end: i, text: css.slice(start, i) });
  while (i < n) {
    const start = i, c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      push(end < 0 ? "bad-comment" : "comment", start);
    } else if (WS.has(c)) {
      while (i < n && WS.has(css[i])) i++;
      push("ws", start);
    } else if (c === '"' || c === "'") {
      let type = "eof-string";
      i++;
      while (i < n) {
        const d = css[i];
        if (d === c) { i++; type = "string"; break; }
        if (NEWLINE.has(d)) { type = "bad-string"; break; }
        if (d === "\\") {
          if (i + 1 >= n) i++;
          else if (css[i + 1] === "\r" && css[i + 2] === "\n") i += 3;
          else if (NEWLINE.has(css[i + 1])) i += 2;
          else i = escapeEnd(css, i);
        } else i++;
      }
      push(type, start);
    } else if (PUNCT.has(c)) {
      i++;
      push(c, start);
    } else {
      while (i < n) {
        const d = css[i];
        if (WS.has(d) || PUNCT.has(d) || d === '"' || d === "'" || (d === "/" && css[i + 1] === "*")) break;
        if (d === "\\" && i + 1 < n && !NEWLINE.has(css[i + 1])) i = escapeEnd(css, i);
        else i++;
      }
      // url( with an unquoted address is a single token, up to ")".
      if (css[i] === "(" && /(?:^|[^\w-])url$/i.test(css.slice(start, i))) {
        let j = i + 1;
        while (j < n && WS.has(css[j])) j++;
        if (css[j] !== '"' && css[j] !== "'") {
          while (j < n && css[j] !== ")") j = css[j] === "\\" ? escapeEnd(css, j) : j + 1;
          i = Math.min(n, j + 1);
          push("url", start);
          continue;
        }
      }
      push("chunk", start);
    }
  }
  return out;
}

// Rules as the browser would see them, without the nesting the tool never writes (a "{" inside a
// declaration block is reported). Imports are cut out for replaceSync, which ignores them.
function parseCss(css) {
  const all = tokenize(css);
  const problems = [];
  const BROKEN = { "bad-comment": "閉じていないコメント", "bad-string": "途中で改行された文字列", "eof-string": "閉じていない文字列" };
  for (const t of all) {
    if (BROKEN[t.type]) problems.push(`${BROKEN[t.type]}（${lineAt(css, t.start)} 行目）: ${short(t.text)}`);
  }
  const toks = all.filter(t => t.type !== "comment" && t.type !== "bad-comment" && t.type !== "ws");
  const blockEnd = open => {
    const stack = [CLOSE[toks[open].type]];
    for (let k = open + 1; k < toks.length; k++) {
      const type = toks[k].type;
      if (type === stack[stack.length - 1]) {
        stack.pop();
        if (!stack.length) return k;
      } else if (CLOSE[type]) stack.push(CLOSE[type]);
    }
    problems.push(`閉じていない「${toks[open].type}」（${lineAt(css, toks[open].start)} 行目）`);
    return toks.length;
  };
  const next = k => (CLOSE[toks[k].type] ? blockEnd(k) + 1 : k + 1);
  const slice = (from, to) => (to > from ? css.slice(toks[from].start, toks[to - 1].end) : "");

  function parseDecls(from, to) {
    const decls = [];
    for (let k = from; k < to; k++) {
      const start = k;
      let block = false;
      while (k < to && toks[k].type !== ";") {
        if (toks[k].type === "{") block = true;
        k = next(k);
      }
      const end = Math.min(k, to);
      if (end === start) continue;
      const text = slice(start, end);
      if (block) problems.push(`宣言のところに { があります（入れ子の規則として読まれる）: ${short(text)}`);
      else if (toks[start].type === "chunk" && start + 1 < end && toks[start + 1].type === ":") decls.push({ prop: toks[start].text.toLowerCase(), text });
      else problems.push(`宣言として読めない（${lineAt(css, toks[start].start)} 行目）: ${short(text)}`);
    }
    return decls;
  }

  function parseRules(from, to, top) {
    const rules = [];
    let k = from;
    while (k < to) {
      const t = toks[k];
      if (top && t.type === "chunk" && t.text.startsWith("@")) {
        const name = t.text.slice(1).toLowerCase();
        let j = k + 1;
        while (j < to && toks[j].type !== ";" && toks[j].type !== "{") j = next(j);
        if (j >= to) {
          problems.push(`終わらない @${name}: ${short(slice(k, to))}`);
          break;
        }
        if (toks[j].type === ";") {
          rules.push({ kind: name === "import" ? "import" : "at", name, start: t.start, end: toks[j].end, text: slice(k, j + 1) });
          k = j + 1;
          continue;
        }
        const end = blockEnd(j);
        const rule = { kind: name === "keyframes" ? "keyframes" : "at", name, prelude: slice(k + 1, j).trim(), start: t.start };
        if (rule.kind === "keyframes") rule.frames = parseRules(j + 1, end, false);
        rules.push(rule);
        k = end + 1;
        continue;
      }
      let j = k;
      while (j < to && toks[j].type !== "{") j = toks[j].type === "(" || toks[j].type === "[" ? blockEnd(j) + 1 : j + 1;
      if (j >= to) {
        problems.push(`規則になっていない文字（${lineAt(css, t.start)} 行目）: ${short(slice(k, to))}`);
        break;
      }
      const end = blockEnd(j);
      rules.push({ kind: "style", selector: slice(k, j).trim(), decls: parseDecls(j + 1, Math.min(end, to)), start: t.start });
      k = end + 1;
    }
    return rules;
  }

  const items = parseRules(0, toks.length, true);
  const imports = items.filter(r => r.kind === "import");
  const rules = items.filter(r => r.kind !== "import");
  const firstRule = rules.length ? rules[0].start : Infinity;
  for (const imp of imports) {
    if (imp.start > firstRule) problems.push(`@import が規則より後ろにあり、読み込まれません: ${short(imp.text)}`);
  }
  let browserCss = css;
  for (const imp of [...imports].reverse()) browserCss = browserCss.slice(0, imp.start) + browserCss.slice(imp.end);
  const frames = rules.reduce((n, r) => n + (r.frames ? r.frames.length : 0), 0);
  const styleDecls = rules.flatMap(r => r.decls || []);
  const frameDecls = rules.flatMap(r => (r.frames || []).flatMap(f => f.decls));
  return { all, rules, imports, frames, styleDecls, frameDecls, problems, browserCss,
    ruleCount: rules.length + frames, declCount: styleDecls.length + frameDecls.length };
}

// The tokens outside strings and comments: equal when no text got out of its string or comment.
const structure = tokens => tokens.filter(t => t.type !== "comment" && t.type !== "ws")
  .map(t => (t.type === "string" ? "<string>" : t.type === "chunk" || PUNCT.has(t.type) ? t.text : `<${t.type}>`));

// ---------------------------------------------------------------- 1. generate

function generate(tool, opts, section) {
  const sets = [];
  for (const lang of tool.langs) {
    let win;
    try {
      win = loadScripts(tool, lang);
    } catch (err) {
      section.fail(`${lang}: スクリプトを読み込めません: ${err.stack.split("\n").slice(0, 3).join(" / ")}`);
      continue;
    }
    const cases = [];
    const add = (id, kind, makeState, extra) => {
      let state;
      try {
        state = makeState();
        cases.push(Object.assign({ id, lang, kind, state, css: CONFIG.build(win, state) }, extra));
      } catch (err) {
        section.fail(`${id}: CSS を作れません: ${err.stack.split("\n").slice(0, 3).join(" / ")}`);
      }
    };
    add(`${lang}:default`, "default", () => CONFIG.defaultState(win));
    for (const key of CONFIG.designs(win)) add(`${lang}:design:${key}`, "design", () => CONFIG.designState(win, key), { design: key });
    for (let i = 0; i < opts.cases; i++) add(`${lang}:random:${i}`, "random", () => randomState(win, tool, opts.seed, i));
    if (lang === tool.langs[0]) {
      for (const field of Object.keys(CONFIG.textFields)) {
        CONFIG.textFields[field].forEach((settings, e) => {
          for (const key of CONFIG.designs(win)) {
            const make = value => () => {
              const state = CONFIG.designState(win, key);
              for (const [p, v] of Object.entries(settings)) setPath(state, p, v);
              setPath(state, field, value);
              return state;
            };
            const base = `${lang}:inject:${field}:${e}:${key}`;
            add(`${base}:plain`, "inject-plain", make(MARKER), { field, enabler: e });
            PAYLOADS.forEach((payload, p) => add(`${base}:${p}`, "inject", make(MARKER + payload), { field, enabler: e, payload, plain: `${base}:plain` }));
          }
        });
      }
    }
    sets.push({ lang, win, cases });
  }
  const all = sets.flatMap(s => s.cases);
  const count = kind => all.filter(c => c.kind === kind).length;
  section.summary = `${tool.langs.join("・")} × （ひな形 ${count("design") / Math.max(1, sets.length)} + 乱数 ${opts.cases}、シード ${opts.seed}）`
    + ` = ${count("design") + count("random")} 本、ほかに既定の状態 ${count("default")} 本と注入の検査用 ${count("inject") + count("inject-plain")} 本`;
  return sets;
}

// ---------------------------------------------------------------- 2. strings

function checkStrings(sets, section) {
  for (const c of sets.flatMap(s => s.cases)) {
    for (const re of BAD_WORDS) {
      const m = re.exec(c.css);
      if (!m) continue;
      const no = lineAt(c.css, m.index);
      section.group(`${short(m[0])} が出る: ${short(lineText(c.css, no).trim())}`, c.id, `${c.id} の ${no} 行目`);
    }
  }
  // Translations of the texts the CSS used (comments and default texts): present, same {name}s.
  const names = text => [...String(text).matchAll(/\{([A-Za-z_]\w*)\}/g)].map(m => m[1]).sort().join(",");
  for (const { lang, win } of sets) {
    if (!win.I18n) continue;
    for (const text of [...win.I18n.missing]) section.fail(`${lang}: 書き出す CSS の文に訳がありません（I18n.missing）: ${short(text)}`);
    for (const text of win.usedTexts) {
      const translated = win.I18n.translate(text);
      if (names(text) !== names(translated)) section.fail(`${lang}: 訳の {名前} が元の文と違います: ${short(text)} → ${short(translated)}`);
    }
  }
}

// ---------------------------------------------------------------- 3. injection

function checkInjection(tool, sets, section) {
  const textInputs = tool.controls.filter(c => c.type === "text" && !CONFIG.ignoreControls.includes(c.path)).map(c => c.path);
  for (const field of textInputs) {
    if (!CONFIG.textFields[field]) section.fail(`index.html の文字欄 ${field} が CONFIG.textFields にありません（検査されていません）`);
  }
  for (const field of Object.keys(CONFIG.textFields)) {
    if (!textInputs.includes(field)) section.fail(`CONFIG.textFields の ${field} が index.html の文字欄にありません`);
  }
  const cases = sets.flatMap(s => s.cases);
  const byId = new Map(cases.map(c => [c.id, c]));
  const reached = new Map();
  for (const c of cases) {
    if (c.kind === "inject-plain" && c.css.includes(MARKER)) reached.set(`${c.field}:${c.enabler}`, true);
    if (c.kind !== "inject") continue;
    const plain = byId.get(c.plain);
    if (!plain) continue;
    const a = structure(plain.parsed.all), b = structure(c.parsed.all);
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (i === a.length && i === b.length) continue;
    const tokens = c.parsed.all.filter(t => t.type !== "comment" && t.type !== "ws");
    const at = tokens[Math.min(i, tokens.length - 1)];
    const no = at ? lineAt(c.css, at.start) : 0;
    section.group(`${c.field} に ${short(c.payload, 50)} を入れると、CSS の形が平文のときと変わる`, c.id,
      `${c.id} の ${no} 行目 ${short(lineText(c.css, no) || "", 110)}`);
  }
  let settings = 0;
  for (const field of Object.keys(CONFIG.textFields)) {
    CONFIG.textFields[field].forEach((s, e) => {
      settings++;
      if (!reached.get(`${field}:${e}`)) section.fail(`${field}: 設定 ${JSON.stringify(s)} では、どのひな形でも CSS に出てきません（CONFIG.textFields を見直してください）`);
    });
  }
  section.summary = `${Object.keys(CONFIG.textFields).length} 欄 × ${PAYLOADS.length} 種の文字（設定 ${settings} 通り × ひな形）`;
}

// ---------------------------------------------------------------- browser

async function launchBrowser(opts) {
  if (!opts.browser) return { reason: "--no-browser が付いています" };
  let pw = null;
  const errors = [];
  for (const name of ["playwright", "playwright-core"]) {
    try {
      pw = require(name);
      break;
    } catch (err) {
      errors.push(`${name}: ${err.code || err.message}`);
    }
  }
  if (!pw) return { reason: `Playwright が見つかりません（cd _dev && npm install）: ${errors.join(", ")}` };
  const tries = [["Playwright の Chromium", {}], ["Google Chrome", { channel: "chrome" }], ["Microsoft Edge", { channel: "msedge" }]];
  if (process.env.CHROME_PATH) tries.unshift([process.env.CHROME_PATH, { executablePath: process.env.CHROME_PATH }]);
  for (const [label, launch] of tries) {
    try {
      const browser = await pw.chromium.launch(launch);
      return { browser, label: `${label} ${browser.version()}` };
    } catch (err) {
      errors.push(`${label}: ${String(err.message).split("\n")[0].slice(0, 160)}`);
    }
  }
  return { reason: `ブラウザを起動できません（npx playwright install chromium）: ${errors.join(" / ")}` };
}

// ---------------------------------------------------------------- 4. syntax

// What the tokenizer found, grouped across files ("（12 行目）" moves to the example).
function reportProblems(section, c) {
  for (const problem of c.parsed.problems) {
    const at = problem.match(/（(\d+ 行目)）/);
    section.group(problem.replace(/（\d+ 行目）/, ""), c.id, at ? `${c.id} の ${at[1]}` : "");
  }
}

async function checkSyntax(browser, sets, section, injectSection) {
  const cases = sets.flatMap(s => s.cases);
  const unique = list => [...new Set(list)];
  const styleDecls = unique(cases.flatMap(c => c.parsed.styleDecls.map(d => d.text)));
  const frameDecls = unique(cases.flatMap(c => c.parsed.frameDecls.map(d => d.text)));
  const selectors = unique(cases.flatMap(c => c.parsed.rules.filter(r => r.kind === "style").map(r => r.selector)));

  const context = await browser.newContext();
  const page = await context.newPage();
  // Each declaration in a sheet of its own: the browser splits shorthands (margin, border...) into
  // longhands, so the declarations of a whole sheet cannot be counted from the CSSOM.
  const probe = await page.evaluate(({ styleDecls, frameDecls, selectors }) => {
    const sheet = new CSSStyleSheet();
    const read = text => {
      try {
        sheet.replaceSync(text);
        return [...sheet.cssRules];
      } catch (err) {
        return [];
      }
    };
    return {
      style: styleDecls.map(d => {
        const r = read(`a{${d}}`);
        return r.length === 1 && r[0].style.length > 0;
      }),
      frame: frameDecls.map(d => {
        const r = read(`@keyframes p{0%{${d}}}`);
        return r.length === 1 && r[0].cssRules.length === 1 && r[0].cssRules[0].style.length > 0;
      }),
      selector: selectors.map(s => read(`${s}{}`).length === 1),
    };
  }, { styleDecls, frameDecls, selectors });
  const okStyle = new Map(styleDecls.map((d, i) => [d, probe.style[i]]));
  const okFrame = new Map(frameDecls.map((d, i) => [d, probe.frame[i]]));
  const okSelector = new Map(selectors.map((s, i) => [s, probe.selector[i]]));

  const readSheets = texts => page.evaluate(list => list.map(text => {
    const sheet = new CSSStyleSheet();
    try {
      sheet.replaceSync(text);
    } catch (err) {
      return { error: String(err) };
    }
    const nested = rule => [...(rule.cssRules || [])].reduce((n, child) => n + 1 + nested(child), 0);
    const out = { top: 0, frames: 0, nested: 0, other: [], lens: [] };
    for (const rule of sheet.cssRules) {
      out.top++;
      if (rule instanceof CSSStyleRule) {
        out.lens.push(rule.style.length);
        out.nested += nested(rule);
      } else if (rule instanceof CSSKeyframesRule) {
        out.lens.push(null);
        out.frames += rule.cssRules.length;
      } else {
        out.lens.push(null);
        out.other.push(rule.constructor.name);
      }
    }
    return out;
  }), texts);

  let written = { rules: 0, decls: 0 }, read = { rules: 0, decls: 0 };
  const results = new Map();
  for (let i = 0; i < cases.length; i += 25) {
    const batch = cases.slice(i, i + 25);
    const counts = await readSheets(batch.map(c => c.parsed.browserCss));
    batch.forEach((c, k) => {
      const got = counts[k], p = c.parsed;
      const accepted = p.styleDecls.filter(d => okStyle.get(d.text)).length + p.frameDecls.filter(d => okFrame.get(d.text)).length;
      const rules = got.error ? 0 : got.top + got.frames + got.nested;
      results.set(c.id, { rules, decls: accepted });
      written.rules += p.ruleCount;
      written.decls += p.declCount;
      read.rules += rules;
      read.decls += accepted;
      reportProblems(section, c);
      if (got.error) {
        section.group(`replaceSync が失敗: ${got.error}`, c.id);
        return;
      }
      if (got.top !== p.rules.length || got.frames !== p.frames || got.nested) {
        const bad = p.rules.filter(r => r.kind === "style" && !okSelector.get(r.selector));
        for (const r of bad) section.group(`捨てられたセレクタ ${short(r.selector, 120)}`, c.id);
        if (!bad.length || got.nested || got.other.length) {
          section.group(`規則の数が合わない${got.nested ? "（入れ子の規則として読まれたものがある）" : ""}${got.other.length ? `（${got.other.join(", ")}）` : ""}`,
            c.id, `${c.id} は 書いた ${p.ruleCount} / 読まれた ${rules}`);
        }
      } else {
        p.rules.forEach((r, n) => {
          if (r.kind === "style" && r.decls.some(d => okStyle.get(d.text)) && got.lens[n] === 0) {
            section.group(`${short(r.selector, 100)} の宣言が、シート全体では 1 つも読まれない`, c.id);
          }
        });
      }
      for (const d of p.styleDecls) if (!okStyle.get(d.text)) section.group(`捨てられた宣言 ${short(d.text, 100)}`, c.id);
      for (const d of p.frameDecls) if (!okFrame.get(d.text)) section.group(`@keyframes の中で捨てられた宣言 ${short(d.text, 100)}`, c.id);
    });
  }
  await context.close();
  section.summary = `${cases.length} 本、規則 ${written.rules.toLocaleString()} のうち ${read.rules.toLocaleString()}、`
    + `宣言 ${written.decls.toLocaleString()} のうち ${read.decls.toLocaleString()} が読まれた（@import は除いて数える）`;

  // The browser's word on check 3: a payload reads as many rules and declarations as plain text.
  let compared = 0;
  for (const c of cases) {
    if (c.kind !== "inject") continue;
    const a = results.get(c.plain), b = results.get(c.id);
    if (!a || !b) continue;
    compared++;
    if (a.rules !== b.rules || a.decls !== b.decls) {
      injectSection.group(`${c.field} に ${short(c.payload, 50)} を入れると、ブラウザが読む規則・宣言の数が平文のときと変わる`, c.id,
        `${c.id} は 規則 ${a.rules}→${b.rules}、宣言 ${a.decls}→${b.decls}`);
    }
  }
  injectSection.summary += `。ブラウザでも ${compared} 本の規則・宣言の数を平文のときと比べた`;
}

// ---------------------------------------------------------------- 5. page

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serve(root) {
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch (err) {
      res.writeHead(400).end();
      return;
    }
    const file = path.join(root, pathname.endsWith("/") ? pathname + "index.html" : pathname);
    if (path.relative(root, file).startsWith("..")) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
      else res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));

// The culprit: walking down from <body>, the one child whose removal alone ends the overflow.
// Where several children each would (the tabs of a row that cannot wrap), their parent is it.
const measureOverflow = page => page.evaluate(() => {
  const over = () => document.documentElement.scrollWidth - window.innerWidth;
  if (over() <= 0) return null;
  const scrollWidth = document.documentElement.scrollWidth;
  const fixes = el => {
    const value = el.style.getPropertyValue("display"), priority = el.style.getPropertyPriority("display");
    el.style.setProperty("display", "none", "important");
    const fixed = over() <= 0;
    el.style.setProperty("display", value, priority);
    return fixed;
  };
  let el = document.body;
  for (;;) {
    const kids = [...el.children].filter(child => getComputedStyle(child).display !== "none" && fixes(child));
    if (kids.length !== 1) break;
    el = kids[0];
  }
  const name = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "")
    + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).join(".") : "");
  return { scrollWidth, width: window.innerWidth, culprit: `${name}（幅 ${Math.round(el.getBoundingClientRect().width)}px）` };
});

async function checkPage(browser, tool, sets, section) {
  const server = await serve(tool.root);
  const base = `http://127.0.0.1:${server.address().port}`;
  let outside = 0, views = 0;
  try {
    for (const lang of tool.langs) {
      const set = sets.find(s => s.lang === lang);
      const expected = set && set.cases.find(c => c.kind === "default");
      for (const width of CONFIG.page.widths) {
        const where = `${lang} 幅 ${width}`;
        const context = await browser.newContext({ viewport: { width, height: CONFIG.page.height } });
        // Other hosts (Google Fonts...) get an empty answer: the check works offline and the same every time.
        await context.route(url => url.origin !== base, route => {
          outside++;
          return route.fulfill({ status: 200, body: "" });
        });
        const page = await context.newPage();
        const errors = [], overflows = new Map();
        let states = 0;
        page.on("console", msg => {
          if (msg.type() !== "error") return;
          const loc = msg.location();
          errors.push(`${msg.text()}${loc && loc.url ? `（${path.basename(loc.url)}:${loc.lineNumber}）` : ""}`);
        });
        page.on("pageerror", err => errors.push(`例外: ${err.message}`));
        page.on("response", res => {
          if (res.status() >= 400) errors.push(`${res.status()}: ${res.url()}`);
        });
        try {
          await page.goto(`${base}/index.html?lang=${lang}`, { waitUntil: "load" });
          await page.waitForFunction(CONFIG.page.ready, null, { timeout: 15000 });
          await settle(page);
          views++;
          if (expected && (await page.evaluate(CONFIG.page.cssOut)) !== expected.css) {
            section.group(`開いた直後の CSS が、Node で作った CSS と違う（CONFIG.nodeScripts が足りない？）`, where, `${where} と ${expected.id}`);
          }
          const overflow = async label => {
            states++;
            const o = await measureOverflow(page);
            if (!o) return;
            const key = `横にはみ出す（scrollWidth ${o.scrollWidth} > ${o.width}）。原因: ${o.culprit}`;
            if (!overflows.has(key)) overflows.set(key, []);
            overflows.get(key).push(label);
          };
          const tabs = page.locator(CONFIG.page.tabs);
          const count = await tabs.count();
          for (let i = 0; i < Math.max(count, 1); i++) {
            const label = count ? `タブ「${(await tabs.nth(i).textContent()).trim()}」` : "ページ";
            if (count) await tabs.nth(i).evaluate(el => el.click());
            await page.evaluate(() => document.querySelectorAll("details").forEach(d => { d.open = true; }));
            await settle(page);
            await overflow(label);
            // Every row that only some settings show, shown at once; put back afterwards.
            await page.evaluate(sel => {
              window.__checkUnhidden = [...document.querySelectorAll(sel)].filter(el => el.hidden);
              window.__checkUnhidden.forEach(el => { el.hidden = false; });
            }, CONFIG.page.conditional);
            await settle(page);
            await overflow(`${label}（条件つきの行もすべて表示）`);
            await page.evaluate(() => window.__checkUnhidden.forEach(el => { el.hidden = true; }));
          }
          await page.evaluate(CONFIG.page.exercise);
          await settle(page);
          await overflow("ひな形の適用・メッセージ送信のあと");
          const missing = await page.evaluate(() => (window.I18n ? [...window.I18n.missing] : []));
          for (const text of missing) section.group(`訳がない（I18n.missing）: ${short(text)}`, where);
        } catch (err) {
          section.group(`確かめる途中で止まった: ${String(err.message).split("\n")[0]}`, where);
        }
        for (const [key, labels] of overflows) {
          section.group(key, where, `${where} は ${labels.length === states ? `調べた ${states} 状態すべて（どのタブでも）` : labels.join("、")}`);
        }
        for (const e of errors) section.group(`コンソールのエラー: ${e}`, where);
        await context.close();
      }
    }
  } finally {
    server.close();
  }
  section.summary = `${tool.langs.join("・")} × 幅 ${CONFIG.page.widths.join("・")} の ${views} 画面`
    + `（外部への読み込み ${outside} 件は空で返した）`;
}

// ---------------------------------------------------------------- 6. snapshots

function lineDiff(before, after, context = 3) {
  const a = before.split("\n"), b = after.split("\n");
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const x = a.slice(pre, a.length - suf), y = b.slice(pre, b.length - suf);
  const ops = a.slice(0, pre).map(l => [" ", l]);
  if (x.length * y.length > 4e6) {
    x.forEach(l => ops.push(["-", l]));
    y.forEach(l => ops.push(["+", l]));
  } else {
    const L = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
    for (let i = x.length - 1; i >= 0; i--) {
      for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    let i = 0, j = 0;
    while (i < x.length || j < y.length) {
      if (i < x.length && j < y.length && x[i] === y[j]) ops.push([" ", x[i++]]), j++;
      else if (i < x.length && (j === y.length || L[i + 1][j] >= L[i][j + 1])) ops.push(["-", x[i++]]);
      else ops.push(["+", y[j++]]);
    }
  }
  a.slice(a.length - suf).forEach(l => ops.push([" ", l]));
  const oldNo = [], newNo = [];
  let o = 1, n = 1;
  for (const [sign] of ops) {
    oldNo.push(o);
    newNo.push(n);
    if (sign !== "+") o++;
    if (sign !== "-") n++;
  }
  const changed = ops.map(([sign], i) => (sign === " " ? -1 : i)).filter(i => i >= 0);
  const out = [];
  for (let h = 0; h < changed.length;) {
    const start = Math.max(0, changed[h] - context);
    let last = changed[h];
    while (h + 1 < changed.length && changed[h + 1] - last <= 2 * context) last = changed[++h];
    h++;
    const hunk = ops.slice(start, Math.min(ops.length, last + context + 1));
    out.push(`@@ -${oldNo[start]},${hunk.filter(([s]) => s !== "+").length} +${newNo[start]},${hunk.filter(([s]) => s !== "-").length} @@`);
    for (const [sign, text] of hunk) out.push(sign + text.replace(/\r/g, "␍"));
  }
  return out;
}

function checkSnapshots(sets, opts, section, blocked) {
  const set = sets.find(s => s.lang === "ja") || sets[0];
  if (!set) return section.fail("比べる CSS がありません");
  const want = new Map(set.cases.filter(c => c.kind === "design").map(c => [`${c.design}.css`, c.css]));
  const have = fs.existsSync(SNAPSHOT_DIR) ? fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith(".css")) : [];
  const rel = file => path.relative(process.cwd(), path.join(SNAPSHOT_DIR, file)) || file;
  if (opts.update && blocked.length) {
    section.fail(`${blocked.join(" ")} が NG なので、--update でも書き直していません（壊れた出力を正しいものとして残さないため）`);
    return;
  }
  if (opts.update) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const changed = [];
    for (const [file, css] of want) {
      const target = path.join(SNAPSHOT_DIR, file);
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== css) changed.push(file);
      fs.writeFileSync(target, css);
    }
    const removed = have.filter(f => !want.has(f));
    for (const file of removed) fs.unlinkSync(path.join(SNAPSHOT_DIR, file));
    section.summary = `--update: ${want.size} 本を書き直した（変わった・増えた ${changed.length} 本${changed.length ? ": " + changed.join(", ") : ""}`
      + `${removed.length ? `、消した ${removed.join(", ")}` : ""}）`;
    return;
  }
  for (const [file, css] of want) {
    const target = path.join(SNAPSHOT_DIR, file);
    if (!fs.existsSync(target)) {
      section.fail(`${rel(file)} がありません（新しいひな形なら --update で作る）`);
      continue;
    }
    const saved = fs.readFileSync(target);
    if (Buffer.compare(saved, Buffer.from(css, "utf8")) === 0) continue;
    const diff = lineDiff(saved.toString("utf8"), css);
    const body = diff.length ? diff : ["（行は同じで、改行コードか末尾だけが違います。.gitattributes を確かめてください）"];
    section.fail([`${rel(file)} と今の出力が違います（意図した変更なら --update）`, `--- ${rel(file)}`, "+++ 今の出力",
      ...body.slice(0, 80), ...(body.length > 80 ? [`…ほか ${body.length - 80} 行`] : [])].join("\n"));
  }
  for (const file of have) if (!want.has(file)) section.fail(`${rel(file)} のひな形がもうありません（--update で消す）`);
  if (section.status === "ok") section.summary = `${want.size} 本が _dev/snapshots/ と 1 バイトも違わない`;
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return 0;
  }
  const tool = readTool(opts.root);
  const sections = [
    new Section(1, "CSS を作る"), new Section(2, "文字列（undefined・NaN など）"), new Section(3, "文字欄からの注入"),
    new Section(4, "構文（ブラウザで読み込む）"), new Section(5, "画面（ブラウザで開く）", "画面"), new Section(6, "前回との差（スナップショット）"),
  ];
  const [gen, strings, inject, syntax, page, snaps] = sections;

  if (opts.dump) {
    const lang = opts.dump.split(":")[0];
    const set = generate(tool, opts, gen).find(s => s.lang === lang);
    const c = set && set.cases.find(x => x.id === opts.dump);
    if (!c) throw new Stop(`${opts.dump} がありません（例: ja:default, ja:design:dicebox, en:random:17）`);
    console.log(`/* ${c.id}\n${JSON.stringify(c.state, null, 1).replace(/\*\//g, "* /")}\n*/`);
    process.stdout.write(c.css);
    return 0;
  }

  console.log(`${CONFIG.name} の点検（${path.relative(process.cwd(), tool.root) || "."}）\n`);
  const sets = generate(tool, opts, gen);
  for (const c of sets.flatMap(s => s.cases)) c.parsed = parseCss(c.css);
  gen.print();
  checkStrings(sets, strings);
  strings.print();
  checkInjection(tool, sets, inject);

  const launched = await launchBrowser(opts);
  const noBrowser = launched.browser ? "" : launched.reason;
  if (launched.browser) {
    console.log(`     （ブラウザ: ${launched.label}）`);
    try {
      await checkSyntax(launched.browser, sets, syntax, inject);
      inject.print();
      syntax.print();
      await checkPage(launched.browser, tool, sets, page);
    } finally {
      await launched.browser.close();
    }
  } else {
    // Without a browser, the tokenizer's findings still count; the browser's verdict is missing.
    for (const c of sets.flatMap(s => s.cases)) reportProblems(syntax, c);
    inject.summary += "。ブラウザでの読み込みは飛ばした";
    inject.print();
    for (const s of [syntax, page]) {
      if (opts.requireBrowser) s.fail(`ブラウザがありません（--require-browser）: ${noBrowser}`);
      else s.skip(noBrowser);
    }
    syntax.print();
  }
  page.print();
  checkSnapshots(sets, opts, snaps, [gen, strings, inject, syntax].filter(s => s.status === "fail").map(s => `[${s.no}]`));
  snaps.print();

  const failed = sections.filter(s => s.status === "fail").map(s => `[${s.no}]`);
  const skipped = sections.filter(s => s.status === "skip").map(s => `[${s.no}]`);
  console.log("");
  if (failed.length) console.log(`結果: NG ${failed.join(" ")}`);
  else if (skipped.length) console.log(`結果: OK。ただし ${skipped.join(" ")} はブラウザが無いので確かめていません`);
  else console.log("結果: すべて OK");
  return failed.length ? 1 : 0;
}

// "node _dev/check.js | head" closes the pipe early; that is not a failure.
process.stdout.on("error", err => {
  if (err.code !== "EPIPE") throw err;
});

main().then(code => {
  process.exitCode = code;
}, err => {
  console.error(`点検を続けられませんでした: ${err instanceof Stop ? err.message : err && err.stack ? err.stack : err}`);
  process.exitCode = 1;
});
