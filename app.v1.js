/*!
 * app.v1.js - チャットウィンドウメーカー (UI)
 *
 * The whole project is one plain JSON object (`state`), so undo, autosave and
 * project files are all snapshots of it. Preview messages live outside it.
 *
 * Controls are wired declaratively from the HTML (same as the status bar maker):
 *   data-bind="card.radius"       read/write that path
 *   data-out="..." data-fmt="px"  shows the value next to a slider
 *   data-show="a=x|y&b!=z"        visible only while the condition holds
 *   data-options="FONTS"          select filled from ChatPresets
 *   data-nohistory                changes don't create an undo step
 */
(function () {
  "use strict";

  const P = window.ChatPresets, M = window.ChatModel, C = window.ChatCss, K = window.ChatMock;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const SAVE_KEY = "ccf-chatwindow-maker.state";
  const TAB_KEY = "ccf-chatwindow-maker.tab";

  let state = M.defaultState();
  let frameDoc = null;
  const history = { undo: [], redo: [], last: null };

  // ---------------------------------------------------------------- paths

  function resolveTarget(path) {
    const parts = path.split(".");
    let obj = state;
    for (let i = 0; i < parts.length - 1 && obj != null; i++) obj = obj[parts[i]];
    return obj == null ? null : { obj, key: parts[parts.length - 1] };
  }

  function getPath(path) {
    const t = resolveTarget(path);
    return t ? t.obj[t.key] : undefined;
  }

  function setPath(path, value) {
    const t = resolveTarget(path);
    if (t) t.obj[t.key] = value;
  }

  function status(message, isError) {
    const el = $("#status");
    el.textContent = message;
    el.classList.toggle("error", !!isError);
  }

  // ---------------------------------------------------------------- preview messages

  let serial = 0;
  const sendTurns = {};

  function stamp(m) {
    serial++;
    const minutes = 4 + serial;
    return Object.assign({ id: "m" + serial, time: `今日 21:${String(minutes % 60).padStart(2, "0")}` }, m);
  }

  const messages = {};
  function resetMessages(tab) {
    messages[tab] = P.SAMPLE_MESSAGES[tab].map(stamp);
  }
  Object.keys(P.SAMPLE_TABS).forEach(resetMessages);

  const KIND_LABEL = {
    chat: "チャット", success: "ダイス（成功）", failure: "ダイス（失敗）", neutral: "ダイス（成否なし）",
    secret: "ほかの人のシークレットダイス", system: "システムメッセージ", long: "長文",
  };

  // Say why a sent message stays hidden, so an active filter is not taken for a broken button.
  function sentStatus(kind) {
    const label = KIND_LABEL[kind] || "メッセージ";
    const dice = kind === "success" || kind === "failure" || kind === "neutral";
    const where = "（「窓・見出し」タブの「映すメッセージ」で切り替えられます）";
    if (state.list.diceOnly && !dice) status(`${label}を送りました。「ダイスの結果だけ」がオンなので、窓には出ません${where}`);
    else if (kind === "system" && state.list.hideSystem) status(`${label}を送りました。「システムメッセージを除く」がオンなので、窓には出ません${where}`);
    else if (kind === "long" && !state.motion.scroll) status(`${label}を送りました。窓に収まらない本文は、「動き・消す」タブの「長い本文をゆっくり流す」で流せます。`);
    else status(`${label}を送りました。`);
  }

  function send(kind) {
    const list = P.EXTRA_MESSAGES[kind];
    const turn = sendTurns[kind] || 0;
    sendTurns[kind] = turn + 1;
    const base = list[turn % list.length];
    messages[state.preview.tab].push(stamp(Object.assign({ kind }, base)));
    requestRender();
    sentStatus(kind);
  }

  function sendCustom() {
    const text = $("#customText").value.trim();
    if (!text) { status("送る文を入れてください。", true); return; }
    const kind = $("#customKind").value;
    const [body, result] = text.split("|").map(s => s.trim());
    if (kind !== "chat" && !result) { status("ダイスの結果は「|」の後ろに書きます（例: CC<=50 | (1D100<=50) ＞ 23 ＞ 成功）。", true); return; }
    messages[state.preview.tab].push(stamp({ who: $("#customWho").value, kind, text: body, result: kind === "chat" ? undefined : result }));
    $("#customText").value = "";
    requestRender();
    sentStatus(kind);
  }

  // ---------------------------------------------------------------- controls

  function readInput(el) {
    if (el.type === "checkbox") return el.checked;
    if (el.type === "range" || el.type === "number" || el.hasAttribute("data-number")) return Number(el.value);
    return el.value;
  }

  function labelFor(el) {
    if (el.getAttribute("aria-label")) return;
    const label = el.closest(".row")?.querySelector(":scope > label");
    if (label && label.textContent.trim()) el.setAttribute("aria-label", label.textContent.trim());
  }

  // dragging: a slider is still being dragged. Chromium drops the drag when rows around the slider
  // appear or disappear, so those updates wait for the "change" event on release.
  function afterChange(path, dragging) {
    if (dragging) {
      updateOutputs();
      return;
    }
    if (path === "source.w" || path === "source.h") {
      state.source.w = Math.min(3840, Math.max(120, Math.round(state.source.w) || 480));
      state.source.h = Math.min(2160, Math.max(80, Math.round(state.source.h) || 460));
      syncControls();
    } else if (path === "source.room") {
      updateChatUrl();
    } else if (path === "motion.scroll" && state.motion.scroll) {
      // Scrolling needs one message in a window that fills the source.
      const changed = state.list.count !== 1 || state.panel.mode !== "fixed";
      state.list.count = 1;
      state.panel.mode = "fixed";
      syncControls();
      if (changed) status("長い本文を流すため、映す件数を 1 件、窓を「ソースいっぱいの窓」にしました。");
    }
    updateVisibility();
    updateOutputs();
  }

  function bindControls(root) {
    for (const el of root.querySelectorAll("[data-bind]")) {
      if (el.dataset.bound) continue;
      el.dataset.bound = "1";
      labelFor(el);
      const noHistory = el.hasAttribute("data-nohistory");
      const apply = commitAfter => () => {
        const value = readInput(el);
        if (typeof value === "number" && !Number.isFinite(value)) return;
        setPath(el.dataset.bind, value);
        afterChange(el.dataset.bind, el.type === "range" && !commitAfter);
        if (commitAfter) noHistory ? scheduleSave() : commit();
        requestRender();
      };
      if (el.type !== "number") el.addEventListener("input", apply(false));
      el.addEventListener("change", apply(true));
    }
  }

  function formatValue(value, fmt) {
    const r = Math.round(value * 100) / 100;
    switch (fmt) {
      case "pct": return Math.round(value * 100) + "%";
      case "px": return r + "px";
      case "sec": return r + "秒";
      case "em": return r.toFixed(2);
      case "items": return value + "件";
      case "lines": return value > 0 ? value + "行" : "切らない";
      default: return String(r);
    }
  }

  function updateOutputs() {
    for (const out of $$("output[data-out]")) {
      const value = getPath(out.dataset.out);
      if (typeof value === "number") out.textContent = formatValue(value, out.dataset.fmt);
    }
  }

  // "a=x|y" : a is x or y.  "a!=x" : a is not x.  Joined with "&".
  // A "|" right after a value may also start a new clause: "name.style!=colon|name.show=false".
  function evalCondition(cond) {
    return cond.split("&").every(part => {
      const clauses = [];
      for (const piece of part.split("|")) {
        if (/^[\w.]+!?=/.test(piece)) clauses.push({ raw: piece, values: [] });
        else if (clauses.length) clauses[clauses.length - 1].values.push(piece);
      }
      return clauses.some(clause => {
        const m = clause.raw.match(/^([\w.]+)(!?=)(.*)$/);
        const hit = [m[3], ...clause.values].includes(String(getPath(m[1])));
        return m[2] === "=" ? hit : !hit;
      });
    });
  }

  function updateVisibility() {
    for (const el of $$("[data-show]")) el.hidden = !evalCondition(el.dataset.show);
  }

  function syncControls() {
    for (const el of $$("[data-bind]")) {
      const typing = el === document.activeElement && (el.type === "text" || el.type === "number");
      if (typing) continue;
      const value = getPath(el.dataset.bind);
      if (value === undefined) continue;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value;
    }
    for (const btn of $$("#bgSeg button")) btn.setAttribute("aria-pressed", String(btn.dataset.bg === state.preview.bg));
    $("#stage").className = "stage bg-" + state.preview.bg;
    updateVisibility();
    updateOutputs();
    updateHistoryButtons();
    updateChatUrl();
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function optionsHtml(list) {
    return list.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join("");
  }

  // Shown in the OBS tab and above the CSS buttons: pasting the room URL itself shows the whole room in OBS.
  function updateChatUrl() {
    const url = M.chatUrl(state.source.room);
    $("#chatUrl").value = url;
    $("#copyUrl").disabled = !url;
    $("#chatUrlMain").value = url;
    $("#sourceUrlSet").hidden = !url;
    $("#sourceUrlMissing").hidden = !!url;
  }

  function copyChatUrl() {
    const url = M.chatUrl(state.source.room);
    if (!url) return;
    copyText(url).then(ok => status(ok ? "URL をコピーしました。OBS のブラウザソースの URL に貼り付けてください。" : "コピーできませんでした。", !ok));
  }

  // ---------------------------------------------------------------- preview

  let renderQueued = false;

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderNow();
    });
  }

  function currentCss() {
    return C.build(state, { url: M.chatUrl(state.source.room) });
  }

  function renderNow() {
    const css = currentCss();
    $("#cssOut").value = css;
    applySize();
    if (!frameDoc) return;
    K.update(frameDoc, { css, tab: state.preview.tab, messages: messages[state.preview.tab] });
  }

  function applySize() {
    const { w, h } = state.source;
    const stage = $("#stage");
    const avail = Math.max(120, stage.clientWidth - 32);
    const k = Math.min(1, avail / w, 620 / h);
    const frame = $("#preview");
    if (frame.style.width !== w + "px") frame.style.width = w + "px";
    if (frame.style.height !== h + "px") frame.style.height = h + "px";
    frame.style.transform = `scale(${k})`;
    $("#frameBox").style.width = Math.round(w * k) + "px";
    $("#frameBox").style.height = Math.round(h * k) + "px";
    $("#stageInfo").textContent = `表示 ${Math.round(k * 100)}%　ピンクの点線 = ブラウザソースの範囲${state.hover.tabs ? "　マウスを乗せるとタブが出ます（OBS の対話と同じ）" : ""}`;
    $("#sizeNote").innerHTML = `ブラウザソースの大きさ　幅 <b>${w}</b> × 高さ <b>${h}</b>`;
  }

  function setupFrame() {
    const frame = $("#preview");
    frame.addEventListener("load", () => {
      frameDoc = frame.contentDocument;
      renderNow();
    });
    frame.srcdoc = K.documentHtml();
    new ResizeObserver(() => applySize()).observe($("#stage"));
  }

  // ---------------------------------------------------------------- output

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  function copyCss() {
    copyText(currentCss()).then(ok => {
      if (!ok) { status("コピーできませんでした。下の「書き出す CSS を見る」から選んでコピーしてください。", true); return; }
      const urlNote = M.chatUrl(state.source.room) ? "" : "ブラウザソースの URL は、末尾が /chat のチャット画面のものにしてください。";
      status(`CSS をコピーしました。OBS のブラウザソース（幅 ${state.source.w} × 高さ ${state.source.h}）のカスタム CSS に貼り付けてください。${urlNote}`);
    });
  }

  function baseName() {
    return String(state.fileBase || "").replace(/[\\/:*?"<>|]/g, "_").trim() || "chatwindow";
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function downloadCss() {
    const name = `${baseName()}.css`;
    download(new Blob([currentCss()], { type: "text/css" }), name);
    status(`${name} を保存しました。`);
  }

  // ---------------------------------------------------------------- history & saving

  function updateHistoryButtons() {
    $("#undo").disabled = !history.undo.length;
    $("#redo").disabled = !history.redo.length;
  }

  function commit() {
    const snap = JSON.stringify(state);
    if (snap === history.last) return;
    if (history.last !== null) {
      history.undo.push(history.last);
      if (history.undo.length > 150) history.undo.shift();
    }
    history.redo.length = 0;
    history.last = snap;
    updateHistoryButtons();
    scheduleSave();
  }

  // The preview settings are not part of the design; keep them across undo.
  function restore(snap) {
    const preview = state.preview;
    state = JSON.parse(snap);
    state.preview = preview;
    history.last = snap;
    syncAll();
    scheduleSave();
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(history.last);
    restore(history.undo.pop());
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(history.last);
    restore(history.redo.pop());
  }

  let saveTimer = 0;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (err) { /* storage may be blocked */ }
    }, 400);
  }

  function loadSaved() {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      return text ? M.normalize(JSON.parse(text)) : null;
    } catch (err) {
      return null;
    }
  }

  function loadState(next) {
    state = next;
    history.undo.length = 0;
    history.redo.length = 0;
    history.last = JSON.stringify(state);
    syncAll();
    scheduleSave();
  }

  function saveProject() {
    const data = { app: "ccf-chatwindow-maker", version: 1, state };
    download(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }), baseName() + ".chatwindow.json");
    status("プロジェクトを保存しました。");
  }

  async function openProjectFile(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== "ccf-chatwindow-maker" || !data.state) throw new Error("このツールのプロジェクトファイルではありません。");
      loadState(M.normalize(data.state));
      status(`「${file.name}」を開きました。`);
    } catch (err) {
      status(err instanceof SyntaxError ? "ファイルを読み取れませんでした。" : err.message, true);
    }
  }

  function syncAll() {
    $("#design").value = P.DESIGNS[state.design] ? state.design : Object.keys(P.DESIGNS)[0];
    showDesignDesc();
    syncControls();
    requestRender();
  }

  // ---------------------------------------------------------------- setup

  function switchTab(name) {
    for (const btn of $$("[data-tab]")) btn.setAttribute("aria-selected", String(btn.dataset.tab === name));
    for (const panel of $$("[data-tab-panel]")) panel.hidden = panel.dataset.tabPanel !== name;
    try { localStorage.setItem(TAB_KEY, name); } catch (err) { /* storage may be blocked */ }
  }

  function showDesignDesc() {
    const d = P.DESIGNS[$("#design").value];
    $("#designDesc").textContent = d ? d.desc + "（窓・文字・色・動きがまとめて置き換わります。ブラウザソースの大きさとルームはそのまま）" : "";
  }

  function buildStaticUI() {
    $("#design").innerHTML = optionsHtml(Object.entries(P.DESIGNS).map(([key, d]) => [key, d.label]));
    for (const select of $$("select[data-options]")) {
      const source = P[select.dataset.options];
      const list = Array.isArray(source) ? source : Object.entries(source).map(([key, v]) => [key, v.label]);
      select.innerHTML = optionsHtml(list);
    }
    $("#customWho").innerHTML = optionsHtml(Object.entries(P.SPEAKERS).filter(([key]) => key !== "system").map(([key, s]) => [key, s.name]));
    bindControls(document);
  }

  function wireEvents() {
    for (const btn of $$("[data-tab]")) btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    // Arrow keys / Home / End move between the tabs, as in the WAI-ARIA tabs pattern.
    $(".tabbar").addEventListener("keydown", ev => {
      const tabs = $$("[data-tab]"), i = tabs.indexOf(document.activeElement);
      const next = i < 0 ? undefined : { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[ev.key];
      if (next === undefined) return;
      ev.preventDefault();
      const tab = tabs[(next + tabs.length) % tabs.length];
      tab.focus();
      switchTab(tab.dataset.tab);
    });
    $("#design").addEventListener("change", showDesignDesc);
    $("#applyDesign").addEventListener("click", () => {
      const key = $("#design").value;
      M.applyDesign(state, key);
      commit();
      syncAll();
      status(`「${P.DESIGNS[key].label}」を適用しました。`);
    });
    $("#undo").addEventListener("click", undo);
    $("#redo").addEventListener("click", redo);
    document.addEventListener("keydown", ev => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.target.matches("input[type=text], input[type=number], textarea")) return;
      const key = ev.key.toLowerCase();
      if (key === "z" && !ev.shiftKey) { ev.preventDefault(); undo(); }
      else if (key === "y" || (key === "z" && ev.shiftKey)) { ev.preventDefault(); redo(); }
    });

    for (const btn of $$("#bgSeg button")) {
      btn.addEventListener("click", () => {
        state.preview.bg = btn.dataset.bg;
        syncControls();
        scheduleSave();
      });
    }
    for (const btn of $$("[data-size]")) {
      btn.addEventListener("click", () => {
        const [w, h] = btn.dataset.size.split("x").map(Number);
        Object.assign(state.source, { w, h });
        commit();
        syncControls();
        requestRender();
      });
    }
    for (const btn of $$("[data-send]")) btn.addEventListener("click", () => send(btn.dataset.send));
    $("#sendCustom").addEventListener("click", sendCustom);
    // isComposing: the Enter that confirms a Japanese IME conversion must not send.
    $("#customText").addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); sendCustom(); } });
    $("#resetMessages").addEventListener("click", () => {
      resetMessages(state.preview.tab);
      requestRender();
      status("プレビューのメッセージを最初の状態に戻しました。");
    });

    $("#copyCss").addEventListener("click", copyCss);
    $("#downloadCss").addEventListener("click", downloadCss);
    $("#copyUrl").addEventListener("click", copyChatUrl);
    $("#copyUrlMain").addEventListener("click", copyChatUrl);
    $("#gotoRoom").addEventListener("click", () => {
      switchTab("obs");
      const input = $('[data-bind="source.room"]');
      input.scrollIntoView({ block: "center" });
      input.focus();
    });

    $("#saveProject").addEventListener("click", saveProject);
    $("#openProject").addEventListener("click", () => { $("#projectFile").value = ""; $("#projectFile").click(); });
    $("#projectFile").addEventListener("change", ev => { if (ev.target.files[0]) openProjectFile(ev.target.files[0]); });
    $("#resetAll").addEventListener("click", () => {
      if (!confirm("いまの作業内容を消して、最初の状態に戻します。よろしいですか？")) return;
      loadState(M.defaultState());
      status("最初の状態に戻しました。");
    });
  }

  function init() {
    buildStaticUI();
    wireEvents();
    let tab = "window";
    try { tab = localStorage.getItem(TAB_KEY) || tab; } catch (err) { /* storage may be blocked */ }
    switchTab($$("[data-tab]").some(b => b.dataset.tab === tab) ? tab : "window");
    loadState(loadSaved() || M.defaultState());
    setupFrame();
    status("準備ができました。左で形や色を選ぶと、右のプレビューにすぐ反映されます。");
  }

  init();
})();
