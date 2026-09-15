/*!
 * mock.v1.js - a stand-in for CCFOLIA's standalone chat page (/rooms/{room}/chat), for the preview
 *
 * Structure and base styles copied from CCFOLIA's bundle (2026-09-15); see css.v1.js for the tree.
 * Class names starting with "ccf-" exist only here; the generated CSS must never rely on them.
 * The page's own styles are kept (no CssBaseline, so boxes are content-box; body is #202020;
 * the message list is virtualized), so a CSS that forgets to override something breaks here too.
 */
(function () {
  "use strict";

  const P = window.ChatPresets;
  const FONT = '"Roboto", "Helvetica", "Arial", sans-serif';

  const BASE_CSS = `
*{margin:0;padding:0}
html, body, #root { height: 100%; }
body { background: #202020; overflow: hidden; }
img { vertical-align: middle; user-select: none; }
.ccf-wrap { padding: 8px; }
.MuiDrawer-docked { flex: 0 0 auto; }
.MuiPaper-root { background-color: #121212; color: #fff; transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; }
.ccf-elev4 { box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12); }
.ccf-elev6 { box-shadow: 0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12); }
.MuiDrawer-paper { overflow-y: auto; display: flex; flex-direction: column; height: 100%; flex: 1 0 auto; z-index: 1200; position: fixed; top: 0; outline: 0; right: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.12); background: rgba(44, 44, 44, 0.87); background-image: none; }
.MuiDrawer-docked > .MuiPaper-root { width: 100%; }
.MuiAppBar-root { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; flex-shrink: 0; }
.MuiAppBar-positionSticky { position: sticky; z-index: 1100; top: 0; left: auto; right: 0; }
.MuiAppBar-positionStatic { position: static; }
.MuiAppBar-colorDefault { background-color: #212121; background-image: none; }
.ccf-tabsbar { background: #212121; }
.MuiToolbar-root { position: relative; display: flex; align-items: center; }
.MuiToolbar-gutters { padding-left: 16px; padding-right: 16px; }
@media (min-width: 600px) { .MuiToolbar-gutters { padding-left: 24px; padding-right: 24px; } }
.MuiToolbar-regular { min-height: 56px; }
@media (min-width: 0px) and (orientation: landscape) { .MuiToolbar-regular { min-height: 48px; } }
@media (min-width: 600px) { .MuiToolbar-regular { min-height: 64px; } }
.MuiToolbar-dense { min-height: 48px; }
.ccf-grow { flex-grow: 1; }
.MuiButtonBase-root { display: inline-flex; align-items: center; justify-content: center; position: relative; box-sizing: border-box; background-color: transparent;
  outline: 0; border: 0; margin: 0; border-radius: 0; padding: 0; cursor: pointer; user-select: none; vertical-align: middle; text-decoration: none; color: inherit; }
.MuiIconButton-root { text-align: center; flex: 0 0 auto; font-size: 1.5rem; padding: 12px; border-radius: 50%; overflow: visible; color: #fff; }
.MuiIconButton-sizeSmall { padding: 5px; font-size: 1.125rem; }
.MuiIconButton-edgeStart { margin-left: -12px; }
.MuiIconButton-edgeEnd { margin-right: -12px; }
.MuiSvgIcon-root { user-select: none; width: 1em; height: 1em; display: inline-block; fill: currentColor; flex-shrink: 0; font-size: 1.5rem; }
.MuiSvgIcon-fontSizeSmall { font-size: 1.25rem; }
.MuiTypography-root { margin: 0; }
.MuiTypography-subtitle2 { font-family: ${FONT}; font-weight: bold; font-size: 0.875rem; line-height: 1.57; letter-spacing: 0.00714em; }
.MuiTypography-body2 { font-family: ${FONT}; font-weight: 400; font-size: 0.875rem; line-height: 1.43; letter-spacing: 0.01071em; }
.MuiTypography-caption { font-family: ${FONT}; font-weight: 400; font-size: 0.75rem; line-height: 1.66; letter-spacing: 0.03333em; }
.MuiTypography-noWrap { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.MuiListItemText-primary, .MuiListItemText-secondary { display: block; }
.ccf-text-primary { color: #fff; }
.ccf-text-secondary { color: rgba(255, 255, 255, 0.7); }
.${P.RESULT_CLASS.success} { color: #2196f3; }
.${P.RESULT_CLASS.failure} { color: #dc004e; }
.${P.RESULT_CLASS.neutral} { color: rgba(255, 255, 255, 0.7); }
.MuiList-root { list-style: none; margin: 0; padding: 0; position: relative; }
.ccf-list { flex-grow: 1; flex-shrink: 1; overflow-y: scroll; }
.MuiListItem-root { display: flex; justify-content: flex-start; align-items: center; position: relative; text-decoration: none; width: 100%; box-sizing: border-box;
  text-align: left; padding-top: 8px; padding-bottom: 8px; padding-left: 16px; padding-right: 16px; }
.MuiListItem-alignItemsFlexStart { align-items: flex-start; }
.MuiListItemAvatar-root { min-width: 56px; flex-shrink: 0; }
.MuiListItemAvatar-alignItemsFlexStart { margin-top: 8px; }
.ccf-avbox { width: 40px; height: 40px; overflow: hidden; background: rgba(0, 0, 0, 0.2); }
.ccf-avbox img { object-position: top; width: 40px; }
.MuiAvatar-root { position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px;
  font-family: ${FONT}; font-size: 1.25rem; line-height: 1; border-radius: 50%; overflow: hidden; user-select: none; }
.MuiAvatar-square { border-radius: 0; }
.MuiAvatar-img { width: 100%; height: 100%; text-align: center; object-fit: cover; color: transparent; text-indent: 10000px; }
.MuiAvatarGroup-root { display: flex; flex-direction: row-reverse; }
.MuiAvatarGroup-root .MuiAvatar-root { border: 2px solid #121212; box-sizing: content-box; margin-left: -8px; }
.MuiAvatarGroup-root .MuiAvatar-root:last-child { margin-left: 0; }
.ccf-member { width: 24px; height: 24px; font-size: 12px; }
.ccf-members-bar { min-height: 40px; }
.MuiListItemText-root { flex: 1 1 auto; min-width: 0; margin-top: 4px; margin-bottom: 4px; }
.MuiListItemText-multiline { margin-top: 6px; margin-bottom: 6px; }
.MuiDivider-root { margin: 0; flex-shrink: 0; border-width: 0; border-style: solid; border-color: rgba(255, 255, 255, 0.12); border-bottom-width: thin; }
.MuiDivider-light { border-color: rgba(255, 255, 255, 0.08); }
.MuiDivider-middle { margin-left: 16px; margin-right: 16px; }
.ccf-actions { position: absolute; top: 12px; right: 16px; display: flex; opacity: 0; }
.MuiListItem-root:hover .ccf-actions { opacity: 0.64; }
.ccf-formpaper { position: relative; }
.ccf-form { background: rgba(0, 0, 0, 0.1); }
.MuiTabs-root { overflow: hidden; min-height: 48px; display: flex; }
.MuiTabs-scroller { position: relative; display: inline-block; flex: 1 1 auto; white-space: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
.MuiTabs-scroller::-webkit-scrollbar { display: none; }
.MuiTabs-flexContainer { display: flex; }
.MuiTabs-indicator { position: absolute; height: 2px; bottom: 0; transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms; background-color: #f50057; }
.MuiTabs-scrollButtons { width: 40px; flex-shrink: 0; opacity: 0.8; }
.MuiTabs-scrollButtons.Mui-disabled { opacity: 0; }
.MuiTab-root { font-family: ${FONT}; font-weight: bold; font-size: 0.875rem; line-height: 1.25; letter-spacing: 0.02857em; text-transform: uppercase;
  max-width: 360px; min-width: 48px; min-height: 48px; flex-shrink: 0; padding: 12px 16px; overflow: hidden; white-space: normal; text-align: center;
  flex-direction: column; color: inherit; opacity: 0.6; }
.MuiTab-root.Mui-selected { opacity: 1; }
.MuiBadge-root { position: relative; display: inline-flex; vertical-align: middle; flex-shrink: 0; }
.MuiBadge-badge { display: flex; flex-flow: row wrap; place-content: center; align-items: center; position: absolute; box-sizing: border-box;
  font-family: ${FONT}; font-weight: 500; font-size: 0.75rem; min-width: 20px; line-height: 1; padding: 0 6px; height: 20px; border-radius: 10px;
  z-index: 1; background-color: #dc004e; color: #fff; top: 0; right: 0; transform: scale(1) translate(50%, -50%); transform-origin: 100% 0%; }
.MuiBadge-dot { border-radius: 4px; height: 8px; min-width: 8px; padding: 0; }
.MuiBadge-invisible { transform: scale(0) translate(50%, -50%); }
.ccf-flex { display: flex; align-items: center; }
.ccf-lock { font-size: 14px; margin-right: 4px; }
.ccf-charrow { display: flex; width: 100%; padding: 8px 8px 0; box-sizing: border-box; }
.ccf-charbtn { box-sizing: border-box; border: 1px solid rgba(0, 0, 0, 0.12); width: 40px; min-width: 40px; height: 40px; background: #333; }
.ccf-nameinput { margin: 0 8px; padding: 4px; background: rgba(0, 0, 0, 0.2); flex-grow: 1; color: #fff; font: 400 1rem ${FONT}; border: 0; }
.ccf-input { display: block; padding: 4px 8px; box-sizing: border-box; background: rgba(0, 0, 0, 0.2); color: #fff; width: 100%; }
.ccf-input textarea { width: 100%; height: 92px; resize: none; background: transparent; border: 0; color: inherit; font: 400 1rem/1.4375em ${FONT}; }
.ccf-typing { padding: 4px 16px 8px; color: #646464; }
`;

  const ICON = {
    close: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
    menu: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    left: "M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z",
    right: "M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z",
  };

  const svg = (d, extra) => `<svg class="MuiSvgIcon-root ${extra || ""}" focusable="false" aria-hidden="true" viewBox="0 0 24 24"><path d="${d}"></path></svg>`;

  const avatarCache = new Map();
  function avatarUrl(who) {
    if (avatarCache.has(who)) return avatarCache.get(who);
    const s = P.SPEAKERS[who] || P.SPEAKERS.kp;
    const url = "data:image/svg+xml," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>"
      + `<rect width='200' height='200' fill='${s.color}' fill-opacity='0.35'/><rect width='200' height='200' fill='#1d2130' fill-opacity='0.55'/>`
      + "<circle cx='100' cy='80' r='38' fill='#ecdfcc'/>"
      + `<path d='M100 34c-32 0-48 22-45 52 8-18 24-27 45-27s37 9 45 27c3-30-13-52-45-52z' fill='${s.hair}'/>`
      + `<path d='M30 200c4-46 34-72 70-72s66 26 70 72z' fill='${s.cloth}'/>`
      + "<path d='M82 128l18 24 18-24' fill='#f2ede4'/></svg>").replace(/'/g, "%27");
    avatarCache.set(who, url);
    return url;
  }

  function documentHtml() {
    return "<!doctype html><html lang='ja'><head><meta charset='utf-8'>"
      + `<style id="ccf-base">${BASE_CSS}</style><style id="obs-custom"></style></head>`
      + "<body><div id='root'><div class='ccf-wrap'>"
      + "<div class='MuiDrawer-root MuiDrawer-docked'>"
      + "<div class='MuiPaper-root MuiPaper-elevation MuiPaper-elevation0 MuiDrawer-paper MuiDrawer-paperAnchorRight MuiDrawer-paperAnchorDockedRight'>"
      + "<header class='MuiPaper-root MuiPaper-elevation MuiPaper-elevation4 MuiAppBar-root MuiAppBar-colorDefault MuiAppBar-positionSticky ccf-elev4'>"
      + "<div class='MuiToolbar-root MuiToolbar-gutters MuiToolbar-regular'>"
      + `<button class='MuiButtonBase-root MuiIconButton-root MuiIconButton-edgeStart' tabindex='-1' type='button' aria-label='チャットウィンドウをとじる'>${svg(ICON.close)}</button>`
      + "<div class='ccf-grow'></div><h6 class='MuiTypography-root MuiTypography-subtitle2'>ルームチャット</h6><div class='ccf-grow'></div>"
      + `<button class='MuiButtonBase-root MuiIconButton-root MuiIconButton-edgeEnd' tabindex='-1' type='button'>${svg(ICON.menu)}</button>`
      + "</div></header>"
      + "<ul class='MuiList-root ccf-list' role='log' aria-label='ルームチャット' aria-live='polite'>"
      + "<div class='ccf-vouter' style='height: 0px; width: 100%; position: relative;'>"
      + "<div style='position: absolute; top: 0px; left: 0px; width: 100%; transform: translateY(0px);'></div></div></ul>"
      + "<div class='MuiPaper-root MuiPaper-elevation MuiPaper-square MuiPaper-elevation6 ccf-formpaper ccf-elev6'>"
      + "<form autocomplete='off' class='ccf-form'>"
      + "<header class='MuiPaper-root MuiPaper-elevation MuiPaper-elevation0 MuiAppBar-root MuiAppBar-colorPrimary MuiAppBar-positionStatic ccf-tabsbar'>"
      + "<div class='MuiToolbar-root MuiToolbar-dense'><div class='MuiTabs-root MuiTabs-scrollable'>"
      + `<div style='position: relative; display: inline-flex;'><div class='MuiButtonBase-root MuiTabs-scrollButtons Mui-disabled' role='button'>${svg(ICON.left, "MuiSvgIcon-fontSizeSmall")}</div></div>`
      + "<div class='MuiTabs-scroller MuiTabs-scrollableX' style='margin-bottom: 0px;'><div class='MuiTabs-flexContainer' role='tablist'></div>"
      + "<span class='MuiTabs-indicator'></span></div>"
      + `<div style='position: relative; display: inline-flex;'><div class='MuiButtonBase-root MuiTabs-scrollButtons Mui-disabled' role='button'>${svg(ICON.right, "MuiSvgIcon-fontSizeSmall")}</div></div>`
      + "</div></div></header>"
      + "<div class='ccf-charrow'><button class='MuiButtonBase-root ccf-charbtn' type='button' tabindex='-1'></button><input class='ccf-nameinput' value='KP' tabindex='-1'></div>"
      + "<div class='MuiInputBase-root MuiInputBase-multiline ccf-input'><textarea name='text' placeholder='メッセージを入力' tabindex='-1'></textarea></div>"
      + "<hr class='MuiDivider-root'>"
      + "<div class='MuiBox-root ccf-typing'><span class='MuiTypography-root MuiTypography-caption MuiTypography-noWrap'>Dicebot engine :&nbsp;BCDice</span></div>"
      + "</form></div>"
      + "</div></div></div></div></body></html>";
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function tabsHtml(tab) {
    const secret = P.SAMPLE_TABS.secret;
    const tabs = [
      ["main", `<span class='MuiBadge-root'>メイン<span class='MuiBadge-badge MuiBadge-standard MuiBadge-invisible MuiBadge-colorSecondary'>0</span></span>`],
      ["info", `<span class='MuiBadge-root'>情報<span class='MuiBadge-badge MuiBadge-dot MuiBadge-invisible MuiBadge-colorSecondary'></span></span>`],
      ["other", `<span class='MuiBadge-root'>雑談<span class='MuiBadge-badge MuiBadge-dot MuiBadge-colorSecondary'></span></span>`],
      ["secret", `<span class='MuiBadge-root'><div class='MuiBox-root ccf-flex'>${svg(ICON.lock, "ccf-lock")}${esc(secret.label)}</div>`
        + "<span class='MuiBadge-badge MuiBadge-dot MuiBadge-invisible MuiBadge-colorSecondary'></span></span>"],
    ];
    return tabs.map(([key, label]) => {
      const on = key === tab;
      // Every tab but メイン is sortable, and dnd-kit's attributes replace role="tab" with role="button".
      const role = key === "main" ? "role='tab'" : "role='button' aria-roledescription='sortable'";
      return `<button class='MuiButtonBase-root MuiTab-root MuiTab-textColorInherit${on ? " Mui-selected" : ""}' tabindex='${on ? 0 : -1}' type='button' ${role} aria-selected='${on}'>${label}<span class='MuiTouchRipple-root'></span></button>`;
    }).join("") + `<button class='MuiButtonBase-root MuiTab-root MuiTab-textColorInherit' tabindex='-1' type='button' role='tab' aria-selected='false' aria-label='チャットタブを追加する'>${svg(ICON.add, "MuiSvgIcon-fontSizeSmall")}<span class='MuiTouchRipple-root'></span></button>`;
  }

  function membersHtml() {
    // Users' profile pictures, drawn as a direct second toolbar of the header (not wrapped).
    const avatars = ["hinata", "kp"].map(who => `<div class='MuiAvatar-root MuiAvatar-circular MuiAvatarGroup-avatar ccf-member'><img alt='' src='${avatarUrl(who)}' class='MuiAvatar-img' draggable='false'></div>`);
    return `<div class='MuiToolbar-root MuiToolbar-gutters MuiToolbar-dense ccf-members-bar'><div class='MuiAvatarGroup-root' role='group' aria-label='チャットに参加中のユーザー'>${avatars.join("")}</div></div>`;
  }

  // One message, as CCFOLIA renders it: <div data-index> <ListItem/> <Divider/> </div>
  function entryHtml(index, m) {
    const s = P.SPEAKERS[m.who] || P.SPEAKERS.kp;
    const system = m.kind === "system";
    const avatar = system ? "<div></div>"
      : `<div class='ccf-avbox'><div class='MuiAvatar-root MuiAvatar-square'><img alt='avatar' src='${avatarUrl(m.who)}' class='MuiAvatar-img' draggable='false'></div></div>`;
    const primary = system ? "" : `${esc(s.name)}<span class='MuiTypography-root MuiTypography-caption' style='color: rgb(117, 117, 117);'>&nbsp;-&nbsp;${esc(m.time)}</span>`;
    const resultClass = P.RESULT_CLASS[m.kind];
    const result = m.result && resultClass ? `<span class='MuiTypography-root MuiTypography-body2 ${resultClass}'>&nbsp;${esc(m.result)}</span>` : "";
    // The viewer (the GM's account) gets edit buttons on their own messages.
    const actions = m.who === "kp" ? `<div class='ccf-actions'><button class='MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall' tabindex='-1' type='button' aria-label='チャットを編集する'>${svg(ICON.edit, "MuiSvgIcon-fontSizeSmall")}</button></div>` : "";
    return `<div data-index='${index}'>`
      + "<div class='MuiListItem-root MuiListItem-gutters MuiListItem-padding MuiListItem-alignItemsFlexStart'>"
      + `<div class='MuiListItemAvatar-root MuiListItemAvatar-alignItemsFlexStart'>${avatar}</div>`
      + "<div class='MuiListItemText-root MuiListItemText-multiline'>"
      + `<span class='MuiTypography-root MuiTypography-subtitle2 MuiTypography-noWrap MuiListItemText-primary'${system ? "" : ` style='color: ${s.color};'`}>${primary}</span>`
      + `<p class='MuiTypography-root MuiTypography-body2 MuiListItemText-secondary ${system ? "ccf-text-secondary" : "ccf-text-primary"}' style='word-break: break-all; white-space: pre-wrap; overflow-wrap: anywhere;'>${esc(m.text)}${result}</p>`
      + `</div>${actions}</div>`
      + "<hr class='MuiDivider-root MuiDivider-middle MuiDivider-light'></div>";
  }

  // Imitates @tanstack/react-virtual as CCFOLIA uses it: the outer box gets the sum of the
  // measured item heights (hidden items measure 0) and the list sticks to the bottom.
  function layout(doc) {
    const outer = doc.querySelector(".ccf-vouter");
    if (!outer) return;
    const mem = doc.defaultView.__ccf || {};
    const inner = outer.firstElementChild;
    // The real virtualizer renders no messages while the list is 0px tall, and nothing makes it
    // taller again (seen in OBS, 2026-09-15). Reproduced so such a CSS looks empty here too.
    if (doc.querySelector('[role="log"]').clientHeight === 0) {
      if (inner.children.length) inner.replaceChildren();
      mem.detached = true;
      if (outer.style.height !== "0px") outer.style.height = "0px";
      return;
    }
    if (mem.detached) {
      mem.detached = false;
      inner.insertAdjacentHTML("beforeend", mem.messages.map((m, i) => entryHtml(i, m)).join(""));
    }
    let total = 0;
    for (const el of outer.firstElementChild.children) total += el.getBoundingClientRect().height;
    const h = Math.round(total) + "px";
    if (outer.style.height !== h) outer.style.height = h;
    const list = doc.querySelector('[role="log"]');
    list.scrollTop = list.scrollHeight;
  }

  // data: { css, tab, messages: [{ id, who, kind, text, result, time }] }
  function update(doc, data) {
    const win = doc.defaultView;
    const style = doc.getElementById("obs-custom");
    if (style.textContent !== data.css) style.textContent = data.css;

    const mem = win.__ccf || (win.__ccf = { tab: null, ids: [], messages: [], detached: false });
    if (mem.tab !== data.tab) {
      doc.querySelector('[role="tablist"]').innerHTML = tabsHtml(data.tab);
      const header = doc.querySelector(".MuiDrawer-paper > header");
      header.querySelectorAll(":scope > .MuiToolbar-dense").forEach(el => el.remove());
      if (P.SAMPLE_TABS[data.tab].private) header.insertAdjacentHTML("beforeend", membersHtml());
      const selected = doc.querySelector(".MuiTab-root.Mui-selected");
      const indicator = doc.querySelector(".MuiTabs-indicator");
      indicator.style.left = selected.offsetLeft + "px";
      indicator.style.width = selected.offsetWidth + "px";
    }

    const inner = doc.querySelector(".ccf-vouter").firstElementChild;
    const ids = data.messages.map(m => m.id);
    const appendOnly = mem.tab === data.tab && mem.ids.length <= ids.length && mem.ids.every((id, i) => id === ids[i]);
    if (!mem.detached) {
      if (!appendOnly) inner.innerHTML = "";
      const from = appendOnly ? mem.ids.length : 0;
      if (from < ids.length) inner.insertAdjacentHTML("beforeend", data.messages.slice(from).map((m, i) => entryHtml(from + i, m)).join(""));
    }
    mem.tab = data.tab;
    mem.ids = ids;
    mem.messages = data.messages;

    if (!mem.observer) {
      mem.observer = new win.ResizeObserver(() => layout(doc));
      mem.observer.observe(inner);
      mem.observer.observe(doc.querySelector('[role="log"]'));
    }
    layout(doc);
  }

  window.ChatMock = { documentHtml, update, layout, avatarUrl };
})();
