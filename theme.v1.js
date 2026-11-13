/*!
 * theme.v1.js - dark / light for the shiki365 tools (no dependencies)
 *
 * Same file in every tool and on the hub page. Load it in <head>, after i18n.v1.js and the
 * dictionaries, so a saved choice is applied before the page is painted:
 *   <script src="i18n.v1.js"></script>
 *   <script src="lang.en.v1.js"></script>
 *   <script src="lang.ko.v1.js"></script>
 *   <script src="theme.v1.js"></script>
 *
 * The page's CSS holds both themes as variables on :root: dark by default, and light under
 *   @media (prefers-color-scheme: light) { :root:not([data-theme=dark]) { ... } }
 *   :root[data-theme=light] { ... }
 * so with no choice the page follows the OS. Choosing dark or light sets <html data-theme="...">
 * and keeps the choice in localStorage (shared by every page on shiki365.github.io, like the
 * language); "自動" removes both and follows the OS again.
 *   - [data-theme-switch] gets three buttons, 自動 / ダーク / ライト; the current one has
 *     aria-pressed="true". Labels go through I18n.t(), so they are in the page's language.
 *   - Other open pages of the site follow a change at once (the storage event).
 */
(function () {
  "use strict";

  const STORE = "shiki365.theme";
  const CHOICES = ["auto", "dark", "light"];
  const LABELS = { auto: "自動", dark: "ダーク", light: "ライト" };
  const root = document.documentElement;
  const t = text => (window.I18n ? window.I18n.t(text) : text);

  function saved() {
    try {
      const value = localStorage.getItem(STORE);
      return CHOICES.includes(value) ? value : "auto";
    } catch (err) {
      return "auto";   // storage may be blocked
    }
  }

  let current = saved();

  function apply() {
    if (current === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", current);
    for (const btn of document.querySelectorAll("[data-theme-choice]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === current));
    }
  }

  function set(choice) {
    if (!CHOICES.includes(choice)) return;
    current = choice;
    try {
      if (choice === "auto") localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, choice);
    } catch (err) { /* storage may be blocked: the choice lasts until the page is closed */ }
    apply();
  }

  function buildSwitches() {
    for (const box of document.querySelectorAll("[data-theme-switch]")) {
      box.replaceChildren();
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", t("画面の明るさ"));
      CHOICES.forEach((choice, i) => {
        if (i) box.append(" / ");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.themeChoice = choice;
        btn.textContent = t(LABELS[choice]);
        if (choice === "auto") btn.title = t("パソコンやスマホの設定に合わせる");
        btn.addEventListener("click", () => set(choice));
        box.append(btn);
      });
    }
    apply();
  }

  apply();
  window.addEventListener("storage", ev => {
    if (ev.key !== STORE && ev.key !== null) return;
    current = saved();
    apply();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildSwitches);
  else buildSwitches();

  window.Theme = { get: () => current, set };
})();
