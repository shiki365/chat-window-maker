/*!
 * model.v1.js - project state: defaults, design templates, loading, CCFOLIA URLs
 *
 * A design ("look") replaces panel, title, list, card, avatar, name, text, result and motion.
 * The browser source size, the room, the preview settings and the hover option belong to
 * the user and survive a design change.
 */
(function () {
  "use strict";

  const P = window.ChatPresets;
  const clone = value => JSON.parse(JSON.stringify(value));
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const LOOK_KEYS = ["panel", "title", "members", "list", "card", "avatar", "name", "text", "result", "motion"];
  // CCFOLIA renders 50 extra messages beyond the visible range, so up to 50 latest ones are always in the DOM.
  const MAX_COUNT = 30;

  function deepMerge(base, patch) {
    const out = clone(base);
    for (const key of Object.keys(patch || {})) {
      out[key] = isObj(out[key]) && isObj(patch[key]) ? deepMerge(out[key], patch[key]) : clone(patch[key]);
    }
    return out;
  }

  function designLook(key) {
    const d = P.DESIGNS[key] || {};
    const look = {};
    for (const k of LOOK_KEYS) look[k] = deepMerge(P.BASE_LOOK[k], d[k]);
    return look;
  }

  function applyDesign(state, key) {
    if (!P.DESIGNS[key]) return;
    Object.assign(state, designLook(key));
    state.design = key;
  }

  function defaultState() {
    const state = {
      version: 1,
      design: "dicebox",
      hover: { tabs: true },
      source: { room: "", w: 480, h: 460 },
      preview: { bg: "scene", tab: "main" },
      fileBase: "chatwindow",
    };
    applyDesign(state, "dicebox");
    return state;
  }

  // ---------------------------------------------------------------- loading

  // Fill in keys missing from older or hand-edited project files.
  function mergeDefaults(base, loaded) {
    if (base === null) return loaded === undefined ? null : loaded;
    if (Array.isArray(base) || typeof base !== "object") {
      return loaded === undefined || typeof loaded !== typeof base ? base : loaded;
    }
    if (!isObj(loaded)) return base;
    const out = {};
    for (const key of Object.keys(base)) out[key] = mergeDefaults(base[key], loaded[key]);
    for (const key of Object.keys(loaded)) if (!(key in out)) out[key] = loaded[key];
    return out;
  }

  const clamp = (v, lo, hi, fallback) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || fallback));

  function normalize(input) {
    const loaded = isObj(input) ? input : {};
    const state = mergeDefaults(defaultState(), loaded);
    state.list.count = clamp(state.list.count, 1, MAX_COUNT, 5);
    state.source.w = clamp(state.source.w, 120, 3840, 480);
    state.source.h = clamp(state.source.h, 80, 2160, 460);
    if (!P.SAMPLE_TABS[state.preview.tab]) state.preview.tab = "main";
    if (!P.DESIGNS[state.design]) state.design = "";
    return state;
  }

  // ---------------------------------------------------------------- CCFOLIA URLs

  const ID = /^[A-Za-z0-9_-]{4,}$/;

  function parseRoom(text) {
    const s = String(text || "").trim();
    const m = s.match(/rooms\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : ID.test(s) ? s : "";
  }

  function chatUrl(roomText) {
    const room = parseRoom(roomText);
    return room ? `https://ccfolia.com/rooms/${room}/chat` : "";
  }

  window.ChatModel = { MAX_COUNT, LOOK_KEYS, defaultState, applyDesign, designLook, normalize, clone, parseRoom, chatUrl };
})();
