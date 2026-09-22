/*!
 * css.v1.js - state -> custom CSS for an OBS browser source (no UI)
 *
 * Target page: https://ccfolia.com/rooms/{room}/chat  (the "open in another window" chat)
 * DOM, read from CCFOLIA's bundle (2026-09-15):
 *
 *   #root > div(padding 8px) > div.MuiDrawer-root > div.MuiDrawer-paper   (position fixed, flex column)
 *     header.MuiAppBar-root        > .MuiToolbar-root [button, div(grow), h6 "ルームチャット", div(grow), button]
 *                                  + .MuiToolbar-dense (member icons, private tabs only)
 *     ul.MuiList-root[role="log"]  (overflow-y scroll; a spinner span may come first)
 *       div (style: height = sum of item sizes) > div (style: position absolute, translateY)
 *         div[data-index]          one message; only a window of 50 around the visible range is rendered
 *           div.MuiListItem-root
 *             div.MuiListItemAvatar-root > div(40px) > .MuiAvatar-root > img     (system: an empty div)
 *             div.MuiListItemText-root
 *               span.MuiListItemText-primary (style="color: <character color>")  name + span.caption " - 今日 21:04"
 *               p.MuiListItemText-secondary   text + span.MuiTypography-body2.css-<hash> " <dice result>" + span.caption "[編集済]"
 *             div                  edit buttons (the viewer's own messages)
 *           hr.MuiDivider-root
 *     div.MuiPaper-root > form > header > .MuiToolbar-root > .MuiTabs-root  (tabs: button.MuiTab-root, the open one .Mui-selected;
 *                                                                            sortable tabs have role="button", not "tab")
 *                              + character select, textarea, hr, typing / dicebot line
 *
 * Showing "the latest N": every message but the last N is display:none. The virtualizer then
 * measures those as 0px, so its visible range always reaches the newest message (N <= 30 < overscan 50).
 * The list must not scroll, so flex alignment alone decides which side overflows: it gets
 * overflow: clip, not hidden. CCFOLIA scrolls the list to the newest message, and a hidden box
 * keeps that scroll offset, which hid the start of any message taller than the window.
 *
 * Every declaration gets !important, except properties that animations move (an !important
 * declaration wins over the animation). Those are only set on div[data-index], which the page
 * never styles.
 */
(function () {
  "use strict";

  const P = window.ChatPresets, R = P.RESULT_CLASS;

  const SEL = {
    panel: ".MuiDrawer-paper",
    header: ".MuiDrawer-paper > header",
    list: '.MuiDrawer-paper > [role="log"]',
    outer: '.MuiDrawer-paper > [role="log"] > div:last-child',
    inner: '.MuiDrawer-paper > [role="log"] > div:last-child > div',
    entry: '.MuiDrawer-paper > [role="log"] > div:last-child > div > div[data-index]',
    form: ".MuiDrawer-paper > div.MuiPaper-root",
  };
  const E = SEL.entry;
  const PART = {
    item: " > .MuiListItem-root",
    divider: " > hr",
    actions: " > .MuiListItem-root > div:not(.MuiListItemAvatar-root):not(.MuiListItemText-root)",
    avatarCol: " .MuiListItemAvatar-root",
    avatarBox: " .MuiListItemAvatar-root > div",
    textCol: " .MuiListItemText-root",
    name: " .MuiListItemText-primary",
    time: " .MuiListItemText-primary > .MuiTypography-caption",
    body: " .MuiListItemText-secondary",
    result: " .MuiListItemText-secondary > .MuiTypography-body2",
    edited: " .MuiListItemText-secondary > .MuiTypography-caption",
  };
  const HAS_RESULT = ":has(.MuiListItemText-secondary > .MuiTypography-body2)";
  const IS_SYSTEM = ":has(.MuiListItemAvatar-root > div:empty)";
  const hasResult = kind => `:has(.MuiListItemText-secondary > .${R[kind]})`;

  // ---------------------------------------------------------------- values

  const round = (v, k) => Math.round(v * (k || 100)) / (k || 100);
  const px = v => `${round(v, 10)}px`;

  function hexToRgb(hex) {
    let h = String(hex || "#000").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const v = parseInt(h.slice(0, 6), 16) || 0;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function rgba(hex, alpha) {
    const a = Math.max(0, Math.min(1, alpha == null ? 1 : alpha));
    return a >= 1 ? String(hex).toLowerCase() : `rgba(${hexToRgb(hex).join(", ")}, ${round(a)})`;
  }

  // Dark text on light colors, white text on dark ones.
  function contrastText(hex) {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#15161a" : "#ffffff";
  }

  function cssString(text) {
    return '"' + String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\A ") + '"';
  }

  const safeComment = text => String(text).replace(/\*\//g, "* /");

  // ---------------------------------------------------------------- fonts

  const font = key => P.FONTS[key] || P.FONTS.notosans;

  function weightOf(key, wanted) {
    const list = font(key).weights;
    if (!list) return wanted;
    return list.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), list[0]);
  }

  // name: the typed family for the "pc" font (a font installed on the PC; no import).
  function family(key, name) {
    const f = font(key);
    if (key !== "pc") return `"${f.family}", ${f.stack}`;
    const typed = pcName(name);
    return typed ? `${cssString(typed)}, ${f.stack}` : f.stack;
  }

  const pcName = name => String(name || "").replace(/[\r\n]+/g, " ").trim();

  // uses: [key, weight, typedName]. A PC font shows up only if OBS's PC has it too.
  function pcFontNote(uses) {
    const names = [...new Set(uses.filter(([key]) => key === "pc").map(([, , name]) => pcName(name)).filter(Boolean))];
    if (!names.length) return [];
    return ["   ■ PC のフォント（OBS を動かす PC にも入れてください）", `       ${safeComment(names.join(" / "))}`];
  }

  function fontImports(uses) {
    const map = new Map();
    for (const [key, weight] of uses) {
      const f = font(key);
      if (!f.weights) continue;
      if (!map.has(f.family)) map.set(f.family, new Set());
      map.get(f.family).add(weightOf(key, weight));
    }
    return [...map].map(([name, set]) => {
      const weights = [...set].sort((a, b) => a - b).join(";");
      return `@import url("https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@${weights}&display=swap");`;
    });
  }

  function textShadow(t) {
    const c = rgba(t.outlineColor, t.outlineAlpha);
    if (t.outline === "shadow") return `0 0 3px ${c}, 0 1px 2px ${c}, 1px 0 2px ${c}, -1px 0 2px ${c}`;
    if (t.outline === "glow") return `0 0 4px ${c}, 0 0 10px ${c}, 0 0 18px ${c}`;
    if (t.outline === "stroke") {
      const steps = t.outlineW <= 1 ? 8 : 16, list = [];
      for (let i = 0; i < steps; i++) {
        const a = Math.PI * 2 * i / steps;
        list.push(`${px(Math.cos(a) * t.outlineW)} ${px(Math.sin(a) * t.outlineW)} 0 ${c}`);
      }
      return list.join(", ");
    }
    return "none";
  }

  // Dark specks as an SVG data URL. alpha 0..1 (same as the status bar maker)
  function grainUrl(alpha, size) {
    const s = size || 140, k = round(alpha * 3);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'>`
      + "<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>"
      + `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${k} 0 0 0 ${round(-alpha * 1.35)}'/></filter>`
      + "<rect width='100%' height='100%' filter='url(#g)'/></svg>";
    return `url("data:image/svg+xml,${svg.replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
  }

  // ---------------------------------------------------------------- writer

  function Writer() {
    this.out = [];
  }
  Writer.prototype.add = function (selectors, decls, soft) {
    const keep = new Set(soft || []);
    const lines = Object.entries(decls)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `  ${k}: ${v}${keep.has(k) ? "" : " !important"};`);
    if (!lines.length) return;
    const sel = Array.isArray(selectors) ? selectors.join(",\n") : selectors;
    this.out.push(`${sel} {\n${lines.join("\n")}\n}`);
  };
  Writer.prototype.comment = function (text) {
    this.out.push(`\n/* ---------- ${safeComment(text)} ---------- */`);
  };
  Writer.prototype.raw = function (text) {
    this.out.push(text);
  };

  // ---------------------------------------------------------------- parts

  function panelRules(st, w) {
    const L = st.panel, M = px(L.margin), fit = L.mode === "fit";
    const images = [], sizes = [];
    if (L.texture === "paper") {
      images.push("radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, 0.22), transparent 60%)",
        "radial-gradient(ellipse at center, transparent 45%, rgba(90, 55, 20, 0.32) 100%)", grainUrl(0.22, 160));
      sizes.push("100% 100%", "100% 100%", "160px 160px");
    }
    if (L.texture === "grain") {
      images.push(grainUrl(0.35, 140));
      sizes.push("140px 140px");
    }
    w.comment("窓（ブラウザソースの中に置く箱）");
    w.add(SEL.panel, {
      position: "fixed", left: M, right: M,
      top: !fit || L.anchor === "top" ? M : "auto", bottom: !fit || L.anchor === "bottom" ? M : "auto",
      width: "auto", height: "auto", "min-height": "0", "max-height": `calc(100% - ${px(L.margin * 2)})`,
      margin: "0", padding: px(L.pad), "box-sizing": "border-box", display: "flex", "flex-direction": "column",
      overflow: "hidden", transform: "none", visibility: "visible", "z-index": "1",
      "background-color": rgba(L.bg, L.bgAlpha), "background-image": images.length ? images.join(", ") : "none",
      "background-size": sizes.length ? sizes.join(", ") : undefined,
      border: L.borderW > 0 ? `${px(L.borderW)} solid ${rgba(L.borderColor, L.borderAlpha)}` : "none",
      "border-radius": px(L.radius),
      "box-shadow": L.shadow > 0 ? `0 4px 18px rgba(0, 0, 0, ${round(L.shadow)})` : "none",
      color: st.text.color,
    });

    const layers = [];
    if (L.texture === "scanlines") layers.push("repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px)");
    if (L.corners) {
      const c = rgba(L.cornerColor, L.cornerAlpha), len = "18px", thick = px(Math.max(2, L.borderW + 1));
      const bar = (pos, size) => `linear-gradient(${c}, ${c}) ${pos} / ${size} no-repeat`;
      for (const pos of ["left top", "right top", "left bottom", "right bottom"]) layers.push(bar(pos, `${len} ${thick}`), bar(pos, `${thick} ${len}`));
    }
    if (layers.length) {
      w.add(`${SEL.panel}::after`, {
        content: '""', position: "absolute", inset: "0", "pointer-events": "none", "z-index": "40",
        "border-radius": "inherit", background: layers.join(", "),
      });
    }
  }

  function listRules(st, w) {
    const L = st.list, A = st.panel, newBottom = L.order === "newBottom";
    w.comment("メッセージの並び（最新の件数だけ残す）");
    w.add(SEL.list, {
      // The virtualizer renders nothing while the list is 0px tall (and then it never grows), so keep 1px.
      flex: A.mode === "fit" ? "0 1 auto" : "1 1 auto", "min-height": "1px", height: "auto", width: "auto",
      // clip, not hidden: a hidden box stays scrolled to the newest message and cuts off the top
      // of a message taller than the window (Chromium 90 and later, so OBS 30 too).
      margin: "0", padding: "0", overflow: "clip", display: "flex", "flex-direction": "column",
      // The old side overflows and gets cut off: the top when new messages come at the bottom.
      "justify-content": newBottom ? "flex-end" : "flex-start",
      background: "transparent", "scrollbar-width": "none", position: "relative", "z-index": "1",
    });
    w.add(`${SEL.list} > :not(div)`, { display: "none" });
    // An auto margin only takes free space, so it moves short content without changing which side overflows.
    const auto = newBottom ? (A.anchor === "top" ? { "margin-bottom": "auto" } : {}) : (A.anchor === "bottom" ? { "margin-top": "auto" } : {});
    w.add(SEL.outer, Object.assign({ height: "auto", width: "100%", position: "relative", flex: "none", margin: "0" }, auto));
    w.add(SEL.inner, {
      position: "static", transform: "none", width: "100%", height: "auto", display: "flex",
      "flex-direction": newBottom ? "column" : "column-reverse", "margin-top": px(-L.gap),
    });

    const n = Math.max(1, Math.min(30, Math.round(L.count)));
    w.add(E, { display: "none", padding: "0", "box-sizing": "border-box", position: "relative" });
    w.add(`${E}:nth-last-child(-n+${n})`, { display: "block" });
    const filter = L.diceOnly ? HAS_RESULT : L.hideSystem ? `:not(${IS_SYSTEM})` : "";
    if (filter) {
      w.comment(L.diceOnly ? "ダイスの結果だけ（OBS 31 以降）" : "システムメッセージを除く（OBS 31 以降）");
      // Older OBS drops these two rules and falls back to the plain "latest N" above.
      w.add(`${E}:not(:nth-last-child(-n+${n} of ${filter}))`, { display: "none" });
      w.add(`${E}:nth-last-child(-n+${n} of ${filter})`, { display: "block" });
    }
    w.add(E, { margin: "0", "margin-top": px(L.gap) }, ["margin", "margin-top"]);
  }

  function cardRules(st, w) {
    const C = st.card, AV = st.avatar, bubble = C.style === "bubble", plain = C.style === "plain";
    const ITEM = E + PART.item, TEXT = E + PART.textCol;
    const box = {
      background: rgba(C.bg, C.bgAlpha),
      border: C.borderW > 0 ? `${px(C.borderW)} solid ${rgba(C.borderColor, C.borderAlpha)}` : "none",
      "border-radius": px(C.radius),
      "box-shadow": C.shadow > 0 ? `0 2px 10px rgba(0, 0, 0, ${round(C.shadow)})` : "none",
    };
    const accentW = C.accent !== "none" ? C.accentW : 0;

    w.comment("1件ぶんの箱");
    w.add(ITEM, Object.assign({
      display: "flex", "align-items": AV.align === "center" ? "center" : "flex-start", gap: AV.show ? px(AV.gap) : "0",
      width: "100%", margin: "0", "box-sizing": "border-box", position: "relative", "min-height": "0", "text-align": "left",
      padding: bubble ? "0" : `${px(C.padY)} ${px(C.padX)} ${px(C.padY)} ${px(C.padX + (plain ? accentW + (accentW ? 6 : 0) : accentW))}`,
    }, bubble || plain ? { background: "transparent", border: "none", "border-radius": "0", "box-shadow": "none" } : box));
    w.add(E + PART.actions, { display: "none" });

    w.add(TEXT, Object.assign({ margin: "0", "min-width": "0", flex: "1 1 auto", display: "block", position: bubble ? "relative" : "static" },
      bubble ? Object.assign({ padding: `${px(C.padY)} ${px(C.padX)} ${px(C.padY)} ${px(C.padX + accentW)}` }, box) : {}));
    if (bubble) {
      // A tail pointing at the icon.
      w.add(`${TEXT}::before`, {
        content: '""', position: "absolute", left: "-7px", top: px(Math.min(14, AV.size / 2 - 7) > 6 ? Math.min(14, AV.size / 2 - 7) : 8),
        width: "0", height: "0", border: "7px solid transparent", "border-left": "0", "border-right-color": rgba(C.bg, C.bgAlpha),
      });
    }

    w.add(E + PART.divider, C.divider
      ? { display: "block", margin: `${px(Math.max(2, C.padY / 2))} 0 0`, border: "0", "border-top": `1px solid ${rgba(C.dividerColor, C.dividerAlpha)}`, height: "0" }
      : { display: "none" });
    if (C.divider) w.add(`${E}:last-child > hr`, { display: "none" });

    // Result color of the message, for the accent line and the border (OBS 31 and later).
    if (C.accent === "result" || C.resultBorder) {
      w.comment("ダイスの成否で箱の色を変える（OBS 31 以降）");
      for (const kind of ["success", "failure", "neutral"]) w.add(E + hasResult(kind), { "--cw-res": st.result[kind] });
    }
    if (C.resultBorder) {
      const host = bubble ? TEXT : ITEM;
      w.add(host.split(E).join(E + ":is(" + ["success", "failure"].map(hasResult).join(", ") + ")"), {
        "border-color": "var(--cw-res)", "box-shadow": `0 0 12px ${"var(--cw-res)"}`,
      });
    }

    if (C.accent === "char") {
      // The name keeps the character color as `color` (its text is painted with -webkit-text-fill-color),
      // so a pseudo-element of the name can draw a line in that color across the whole box.
      w.add(E + PART.name + "::before", {
        content: '""', position: "absolute", left: "0", top: "0", bottom: "0", width: px(C.accentW),
        background: "currentColor", "border-radius": `${px(C.radius)} 0 0 ${px(C.radius)}`, "pointer-events": "none",
      });
    } else if (C.accent === "fixed" || C.accent === "result") {
      w.add((bubble ? TEXT : ITEM) + "::after", {
        content: '""', position: "absolute", left: "0", top: "0", bottom: "0", width: px(C.accentW), "pointer-events": "none",
        background: C.accent === "result" ? `var(--cw-res, ${C.accentColor})` : C.accentColor,
        "border-radius": `${px(C.radius)} 0 0 ${px(C.radius)}`,
      });
    }
  }

  function avatarRules(st, w) {
    const AV = st.avatar;
    w.comment("アイコン");
    if (!AV.show) {
      w.add(E + PART.avatarCol, { display: "none" });
      return;
    }
    const radius = { square: "0", rounded: px(Math.round(AV.size * 0.18)), circle: "50%" }[AV.shape] || "0";
    w.add(E + PART.avatarCol, { display: "block", "min-width": "0", width: px(AV.size), margin: "0", flex: "none" });
    w.add(E + PART.avatarBox, {
      width: px(AV.size), height: px(AV.size), "box-sizing": "border-box", overflow: "hidden", "border-radius": radius,
      border: AV.borderW > 0 ? `${px(AV.borderW)} solid ${rgba(AV.borderColor, AV.borderAlpha)}` : "none",
      background: "rgba(0, 0, 0, 0.2)",
    });
    w.add(`${E + PART.avatarBox}:empty`, { background: "transparent", border: "none" });
    w.add(`${E + PART.avatarCol} .MuiAvatar-root`, { width: "100%", height: "100%", "border-radius": "0", background: "transparent" });
    w.add(`${E + PART.avatarCol} img`, { width: "100%", height: "100%", "object-fit": "cover", "object-position": "center top" });
  }

  function nameRules(st, w) {
    const N = st.name, T = st.text, NAME = E + PART.name, colon = N.style === "colon";
    w.comment("名前");
    if (!N.show) {
      // Kept in the layout at zero size: its pseudo-element may still draw the accent line.
      w.add(NAME, { "font-size": "0", "line-height": "0", height: "0", margin: "0", padding: "0", border: "none", overflow: "visible" });
      w.add(E + PART.time, { display: "none" });
      return;
    }
    const fill = N.colorMode === "fixed" ? N.color : null;
    const decls = {
      "font-family": family(N.font, N.fontName), "font-size": px(N.size), "font-weight": weightOf(N.font, N.weight),
      "line-height": "1.35", "letter-spacing": "0.02em", "text-shadow": N.style === "badge" ? "none" : textShadow(T),
      margin: colon ? "0" : `0 0 ${px(N.gap)}`, padding: "0", background: "none", border: "none",
      "-webkit-text-fill-color": fill || "currentColor", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis",
    };
    if (N.style === "underline") Object.assign(decls, { display: "block", width: "fit-content", "max-width": "100%", "padding-bottom": "0.12em", "border-bottom": "2px solid currentColor" });
    else if (N.style === "badge") Object.assign(decls, { display: "block", width: "fit-content", "max-width": "100%", padding: "0.12em 0.65em", "border-radius": "0.6em", background: "currentColor", "-webkit-text-fill-color": fill || "#15161a" });
    else if (colon) Object.assign(decls, { display: "inline", overflow: "visible", "white-space": "normal" });
    else decls.display = "block";
    w.add(NAME, decls);
    if (colon) w.add(NAME + "::after", { content: '"："' });

    w.add(E + PART.time, N.time && !colon
      ? { display: "inline", "font-family": "inherit", "font-size": "0.78em", "font-weight": "400", "margin-left": "0.3em",
        color: rgba(N.timeColor, N.timeAlpha), "-webkit-text-fill-color": rgba(N.timeColor, N.timeAlpha), "letter-spacing": "0" }
      : { display: "none" });
  }

  function textRules(st, w) {
    const T = st.text, colon = st.name.show && st.name.style === "colon", BODY = E + PART.body;
    w.comment("本文");
    const decls = {
      "font-family": family(T.font, T.fontName), "font-size": px(T.size), "font-weight": weightOf(T.font, T.weight),
      color: T.color, "-webkit-text-fill-color": T.color, "line-height": String(T.lineHeight), "letter-spacing": `${T.spacing}em`,
      "text-shadow": textShadow(T), margin: "0", padding: "0", "white-space": "pre-wrap", "overflow-wrap": "anywhere", display: colon ? "inline" : "block",
    };
    if (T.clamp > 0 && !colon) Object.assign(decls, { display: "-webkit-box", "-webkit-box-orient": "vertical", "-webkit-line-clamp": String(T.clamp), overflow: "hidden" });
    w.add(BODY, decls);
    w.add(E + PART.edited, { display: "none" });
    w.add(E + IS_SYSTEM + PART.body, { opacity: "0.75" });
  }

  function resultRules(st, w, keyframe) {
    const RS = st.result, T = st.text, RESULT = E + PART.result;
    w.comment("ダイスの結果（成功・失敗・その他）");
    const decls = {
      "font-family": family(RS.font, RS.fontName), "font-size": px(RS.size), "font-weight": weightOf(RS.font, RS.weight),
      "line-height": "1.35", "letter-spacing": "0.02em", display: RS.newLine ? (RS.style === "text" ? "block" : "table") : "inline",
      "margin-top": RS.newLine ? "0.15em" : "0", "white-space": "pre-wrap",
      // The message sets word-break: break-all inline; keep 失敗 / 成功 in one piece and break at the spaces.
      "word-break": "keep-all", "overflow-wrap": "anywhere",
    };
    if (RS.style !== "text") Object.assign(decls, { padding: "0.05em 0.55em 0.08em 0.3em", "border-radius": "0.35em", "margin-left": RS.newLine ? "0" : "0.2em" });
    if (RS.flash) decls.animation = "cw-flash 1.4s ease-out 1";
    w.add(RESULT, decls, ["animation"]);

    for (const kind of ["success", "failure", "neutral"]) {
      const c = RS[kind];
      const glow = RS.glow && kind !== "neutral" ? `0 0 6px ${rgba(c, 0.85)}, 0 0 14px ${rgba(c, 0.5)}` : "";
      const base = T.outline === "none" ? "" : textShadow(T);
      const d = { color: c, "-webkit-text-fill-color": c, "text-shadow": [glow, base].filter(Boolean).join(", ") || "none" };
      if (RS.style === "badge") Object.assign(d, { border: `1.5px solid ${c}`, background: rgba(c, 0.12) });
      if (RS.style === "fill") {
        const ink = contrastText(c);
        Object.assign(d, { background: c, color: ink, "-webkit-text-fill-color": ink, "text-shadow": "none" });
      }
      w.add(`${E} .MuiListItemText-secondary > .${R[kind]}`, d);
    }
    if (RS.flash) keyframe("cw-flash", "0% { filter: brightness(2.2); } 100% { filter: brightness(1); }");
  }

  // ---------------------------------------------------------------- title

  function titleBoxDecls(T, pad) {
    switch (T.style) {
      case "bar": return { background: rgba(T.bg, T.bgAlpha), margin: `${px(-pad)} ${px(-pad)} ${px(T.gap)}`, padding: `0.45em ${px(pad)}` };
      case "underline": return { "border-bottom": `2px solid ${T.accent}`, "padding-bottom": "0.3em" };
      default: return {};
    }
  }

  function titleTextDecls(T) {
    const decls = {
      "font-family": family(T.font, T.fontName), "font-size": px(T.size), "font-weight": weightOf(T.font, T.weight), color: T.color,
      "-webkit-text-fill-color": T.color, "line-height": "1.35", "letter-spacing": "0.06em", "text-transform": "none",
      "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis", "min-width": "0", flex: "0 1 auto",
    };
    if (T.style === "tab") Object.assign(decls, { background: T.accent, color: contrastText(T.accent), "-webkit-text-fill-color": contrastText(T.accent), padding: "0.22em 0.9em", "border-radius": "0.4em 0.4em 0 0" });
    return decls;
  }

  // Two flex items around the title text: lines ("lines") or springs that set the alignment.
  function springs(T) {
    const line = T.style === "lines";
    const one = grow => ({ display: "block", content: '""', flex: grow ? "1 1 0" : "0 0 0", height: line && grow ? "1px" : "0",
      background: line ? T.accent : "none", "min-width": grow ? "0.6em" : "0", margin: "0", padding: "0", border: "none" });
    return { before: one(line || T.align !== "left"), after: one(line || T.align !== "right"), gap: line ? "0.6em" : "0" };
  }

  function titleRules(st, w) {
    const T = st.title, pad = st.panel.pad;
    if (T.source === "none") {
      w.add(SEL.form, { display: "none" });
      return;
    }
    const sp = springs(T);
    const hostDecls = Object.assign({ display: "block", position: "static", order: "-1", flex: "none", width: "auto", margin: `0 0 ${px(T.gap)}`,
      background: "none", "box-shadow": "none", color: T.color, "z-index": "2" }, titleBoxDecls(T, pad));

    if (T.source === "text") {
      w.comment("見出し");
      w.add(SEL.form, { display: "none" });
      w.add(SEL.header, hostDecls);
      w.add(`${SEL.header} > .MuiToolbar-root:first-child`, { display: "flex", "align-items": "center", gap: sp.gap, "min-height": "0", padding: "0" });
      w.add(`${SEL.header} > .MuiToolbar-root:first-child .MuiIconButton-root`, { display: "none" });
      // :first-child: a private tab adds a second toolbar (member icons) whose children are divs too.
      w.add(`${SEL.header} > .MuiToolbar-root:first-child > div:nth-of-type(1)`, sp.before);
      w.add(`${SEL.header} > .MuiToolbar-root:first-child > div:nth-of-type(2)`, sp.after);
      w.add(`${SEL.header} h6`, Object.assign(titleTextDecls(T), { "font-size": "0", margin: "0" }));
      w.add(`${SEL.header} h6::before`, { content: cssString(T.text), "font-size": px(T.size) });
      return;
    }

    // Title from the open tab. Scoped to "not hovered" so the tabs look normal while picking one in OBS.
    const scope = st.hover.tabs ? "html:not(:hover) " : "";
    const FORM = scope + SEL.form, HEAD = `${FORM} > form > header`;
    w.comment("見出し（開いているタブの名前）");
    w.add(FORM, Object.assign({}, hostDecls, { "border-radius": "0" }));
    w.add(`${FORM} > form`, { background: "none" });
    w.add(`${FORM} > form > :not(header)`, { display: "none" });
    w.add(HEAD, { display: "block", position: "static", background: "none", "box-shadow": "none", color: "inherit" });
    w.add(`${HEAD} > .MuiToolbar-root`, { display: "block", "min-height": "0", padding: "0" });
    w.add(`${HEAD} .MuiTabs-root`, { display: "flex", "align-items": "center", gap: sp.gap, "min-height": "0", overflow: "visible" });
    w.add(`${HEAD} .MuiTabs-root > div:not(.MuiTabs-scroller), ${HEAD} .MuiTabs-indicator, ${HEAD} .MuiTouchRipple-root, ${HEAD} .MuiBadge-badge`, { display: "none" });
    w.add(`${HEAD} .MuiTabs-root::before`, sp.before);
    w.add(`${HEAD} .MuiTabs-root::after`, sp.after);
    w.add(`${HEAD} .MuiTabs-scroller`, { display: "block", flex: "0 1 auto", "min-width": "0", overflow: "hidden", margin: "0" });
    w.add(`${HEAD} [role="tablist"]`, { display: "block" });
    // Not [role="tab"]: the sortable tabs (everything but メイン) get role="button" from dnd-kit.
    w.add(`${HEAD} .MuiTab-root`, { display: "none" });
    w.add(`${HEAD} .MuiTab-root.Mui-selected`, Object.assign(titleTextDecls(T), {
      display: "block", "min-height": "0", "min-width": "0", "max-width": "none", margin: "0", opacity: "1", "text-align": "left", cursor: "default",
      transform: "none",
    }, T.style === "tab" ? {} : { padding: "0", background: "none" }));
    // MUI's badge is vertical-align: middle, which pushed the tab name ~1.5px below the text before it.
    w.add(`${HEAD} .MuiTab-root .MuiBadge-root, ${HEAD} .MuiTab-root .MuiBox-root`, { display: "inline", position: "static", "vertical-align": "baseline", "line-height": "inherit" });
    w.add(`${HEAD} .MuiTab-root svg`, T.lock
      ? { display: "inline-block", width: "0.9em", height: "0.9em", "font-size": "inherit", "vertical-align": "-0.1em", margin: "0 0.25em 0 0", fill: "currentColor" }
      : { display: "none" });
    if (T.source === "textTab") w.add(`${HEAD} .MuiTab-root.Mui-selected::before`, { content: cssString(T.text) });
  }

  // The header's second toolbar holds the icons of the users in a private tab. With a text title it sits
  // inside the title's header; otherwise only that toolbar of the header is shown, under the tab title.
  function membersRules(st, w) {
    const MB = st.members, T = st.title, textTitle = T.source === "text";
    const ROW = `${SEL.header} > .MuiToolbar-root:not(:first-child)`;
    if (!MB.show) {
      w.add(textTitle ? ROW : SEL.header, { display: "none" });
      return;
    }
    w.comment("秘匿タブに参加しているユーザーのアイコン");
    if (!textTitle) {
      w.add(SEL.header, { display: "block", position: "static", order: "0", flex: "none", width: "auto", margin: "0", padding: "0",
        background: "none", "box-shadow": "none", color: "inherit", "z-index": "2" });
      w.add(`${SEL.header} > .MuiToolbar-root:first-child`, { display: "none" });
    }
    w.add(ROW, {
      display: "flex", "align-items": "center", "justify-content": { left: "flex-start", center: "center", right: "flex-end" }[T.align] || "flex-start",
      gap: "0.5em", "min-height": "0", padding: "0", margin: textTitle ? "6px 0 0" : `0 0 ${px(T.gap)}`, background: "none",
    });
    if (MB.label) {
      w.add(`${ROW}::before`, { content: cssString(MB.label), "font-family": family(T.font, T.fontName), "font-size": px(MB.labelSize),
        "font-weight": weightOf(T.font, T.weight), color: T.color, "letter-spacing": "0.06em", "line-height": "1", "white-space": "nowrap" });
    }
    w.add(`${ROW} .MuiAvatarGroup-root`, { display: "flex", "flex-direction": "row-reverse", margin: "0" });
    // MUI draws later users first and overlaps them; the last child is the left-most one.
    w.add(`${ROW} .MuiAvatar-root`, {
      width: px(MB.size), height: px(MB.size), "font-size": px(Math.max(8, MB.size * 0.45)), "box-sizing": "content-box",
      margin: "0", "margin-left": px(MB.spacing), "border-radius": "50%", background: "#5a5a5a",
      border: MB.ringW > 0 ? `${px(MB.ringW)} solid ${rgba(MB.ringColor, MB.ringAlpha)}` : "none",
    });
    w.add(`${ROW} .MuiAvatar-root:last-child`, { "margin-left": "0" });
  }

  // While the mouse is over the page (only in OBS's "Interact" window) the tabs appear, so a tab can be picked.
  function hoverRules(st, w) {
    if (!st.hover.tabs) return;
    w.comment("OBS の「対話」でマウスを乗せたときだけ、タブを出す");
    const FORM = "html:hover " + SEL.form;
    w.add(FORM, { display: "block", position: "absolute", top: "0", left: "0", right: "0", "z-index": "50", margin: "0", padding: "0",
      background: "#212121", "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.6)", "border-radius": "0", order: "-1" });
    w.add(`${FORM} > form > :not(header)`, { display: "none" });
  }

  // ---------------------------------------------------------------- motion

  const ENTER_FRAMES = {
    fade: "from { opacity: 0; }",
    slideUp: "from { opacity: 0; transform: translateY(18px); }",
    slideDown: "from { opacity: 0; transform: translateY(-18px); }",
    slideLeft: "from { opacity: 0; transform: translateX(40px); }",
    slideRight: "from { opacity: 0; transform: translateX(-40px); }",
    pop: "0% { opacity: 0; transform: scale(0.6); } 60% { opacity: 1; transform: scale(1.05); } 100% { transform: scale(1); }",
    blur: "from { opacity: 0; filter: blur(8px); }",
  };

  function motionRules(st, w, keyframe) {
    const MO = st.motion, list = [];
    if (MO.enter !== "none" && ENTER_FRAMES[MO.enter]) {
      list.push(`cw-in-${MO.enter} ${round(MO.enterDur)}s ease-out both`);
      keyframe(`cw-in-${MO.enter}`, ENTER_FRAMES[MO.enter]);
    }
    if (MO.exit) {
      list.push(`cw-out ${round(MO.exitDur)}s ease-in ${round(MO.exitAfter, 10)}s forwards`);
      // Fades first, then gives its space back to the other messages.
      keyframe("cw-out", `0% { opacity: 1; max-height: 1200px; } 75% { opacity: 0; max-height: 1200px; margin-top: ${px(st.list.gap)}; } 100% { opacity: 0; max-height: 0; margin-top: 0; visibility: hidden; }`);
    }
    if (!list.length) return;
    w.comment(MO.exit ? `出るときの動き / ${round(MO.exitAfter, 10)}秒で消える` : "出るときの動き");
    w.add(E, { animation: list.join(", "), "transform-origin": "center center" }, ["animation", "transform-origin"]);
  }

  // ---------------------------------------------------------------- build

  function build(st, opts) {
    opts = opts || {};
    const w = new Writer();
    const keyframes = new Map();
    const keyframe = (name, body) => keyframes.set(name, body);
    const design = P.DESIGNS[st.design];
    const T = st.title;
    const usesTab = T.source === "tab" || T.source === "textTab";
    const needs31 = st.list.diceOnly || st.list.hideSystem || st.card.accent === "result" || st.card.resultBorder;

    const uses = [[st.text.font, st.text.weight, st.text.fontName], [st.result.font, st.result.weight, st.result.fontName]];
    if (st.name.show) uses.push([st.name.font, st.name.weight, st.name.fontName]);
    if (T.source !== "none" || (st.members.show && st.members.label)) uses.push([T.font, T.weight, T.fontName]);

    w.raw([
      "/* ==========================================================================",
      "   ココフォリア → OBS  チャットウィンドウ",
      `   チャットウィンドウメーカーで作成${design ? `（ひな形: ${safeComment(design.label)}）` : ""}`,
      "   --------------------------------------------------------------------------",
      "   ■ ブラウザソースのURL",
      `       ${safeComment(opts.url || "https://ccfolia.com/rooms/{ルームID}/chat")}`,
      "       ※ 末尾が /chat の URL です。ルームの URL だと、ルームの画面（背景や駒）がそのまま映ります。",
      `   ■ ブラウザソースの大きさ  幅 ${st.source.w} / 高さ ${st.source.h}`,
      "   ■ 秘匿タブなどメイン以外を映すとき",
      "       ソースを右クリック →「対話」→ 窓にマウスを乗せるとタブが出るので、映したいタブを選ぶ。",
      "       タブの選択は保存されないので、OBS を起動し直したら選び直してください。",
      ...(needs31 ? ["   ■ ダイスだけ表示・成否の色分けは OBS 31 以降で動きます。"] : []),
      ...pcFontNote(uses),
      "   ========================================================================== */",
    ].join("\n"));

    const imports = fontImports(uses);
    if (imports.length) w.raw(imports.join("\n"));

    w.comment("背景を透過して、余計なものを消す");
    w.add("html, body", { background: "transparent", margin: "0", padding: "0", overflow: "hidden" });
    w.add("#root > div", { padding: "0", margin: "0" });
    w.add("::-webkit-scrollbar", { display: "none" });
    w.add(".MuiSnackbar-root", { display: "none" });

    panelRules(st, w);
    titleRules(st, w);
    membersRules(st, w);
    if (!usesTab && st.hover.tabs) w.add(`html:not(:hover) ${SEL.form}`, { display: "none" });
    listRules(st, w);
    cardRules(st, w);
    avatarRules(st, w);
    nameRules(st, w);
    textRules(st, w);
    resultRules(st, w, keyframe);
    motionRules(st, w, keyframe);
    hoverRules(st, w);

    for (const [name, body] of keyframes) w.raw(`@keyframes ${name} { ${body} }`);
    return w.out.join("\n") + "\n";
  }

  window.ChatCss = { build, SEL, PART, rgba, weightOf, family, contrastText };
})();
