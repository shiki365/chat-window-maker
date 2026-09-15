/*!
 * presets.v1.js - static data: fonts, option lists, design templates, sample messages
 *
 * Adding things:
 *   - a font:    add an entry to FONTS (weights must exist on Google Fonts, or the whole import fails)
 *   - a design:  add an entry to DESIGNS; it is merged over BASE_LOOK
 */
(function () {
  "use strict";

  const SANS = '"Yu Gothic UI","Yu Gothic","Meiryo",sans-serif';
  const SERIF = '"Yu Mincho","YuMincho","Hiragino Mincho ProN",serif';

  // Same list as the status bar maker. weights: verified against fonts.googleapis.com/css2 (2026-09-14).
  // null = installed font, no import.
  const FONTS = {
    notosans: { label: "Noto Sans JP", family: "Noto Sans JP", weights: [400, 500, 700, 800, 900], stack: SANS },
    mplus: { label: "M PLUS 1p", family: "M PLUS 1p", weights: [400, 500, 700, 800, 900], stack: SANS },
    mplusround: { label: "M PLUS Rounded 1c（丸）", family: "M PLUS Rounded 1c", weights: [400, 500, 700, 800, 900], stack: SANS },
    zenkaku: { label: "Zen Kaku Gothic New", family: "Zen Kaku Gothic New", weights: [400, 500, 700, 900], stack: SANS },
    zenmaru: { label: "Zen Maru Gothic（丸）", family: "Zen Maru Gothic", weights: [400, 500, 700, 900], stack: SANS },
    kosugimaru: { label: "Kosugi Maru（丸）", family: "Kosugi Maru", weights: [400], stack: SANS },
    bizud: { label: "BIZ UDPゴシック", family: "BIZ UDPGothic", weights: [400, 700], stack: SANS },
    murecho: { label: "Murecho", family: "Murecho", weights: [400, 500, 700, 800, 900], stack: SANS },
    delagothic: { label: "Dela Gothic One（極太）", family: "Dela Gothic One", weights: [400], stack: SANS },
    mochiypop: { label: "Mochiy Pop One（ポップ）", family: "Mochiy Pop One", weights: [400], stack: SANS },
    dotgothic: { label: "DotGothic16（ドット）", family: "DotGothic16", weights: [400], stack: SANS },
    reggae: { label: "Reggae One", family: "Reggae One", weights: [400], stack: SANS },
    kiwimaru: { label: "Kiwi Maru", family: "Kiwi Maru", weights: [400, 500], stack: SANS },
    hachimaru: { label: "Hachi Maru Pop（手書き）", family: "Hachi Maru Pop", weights: [400], stack: SANS },
    klee: { label: "Klee One（教科書体）", family: "Klee One", weights: [400, 600], stack: SANS },
    notoserif: { label: "Noto Serif JP（明朝）", family: "Noto Serif JP", weights: [400, 500, 700, 800, 900], stack: SERIF },
    shippori: { label: "しっぽり明朝 B1", family: "Shippori Mincho B1", weights: [400, 500, 600, 700, 800], stack: SERIF },
    zenold: { label: "Zen Old Mincho（古風）", family: "Zen Old Mincho", weights: [400, 500, 600, 700, 900], stack: SERIF },
    kaisei: { label: "Kaisei Decol", family: "Kaisei Decol", weights: [400, 500, 700], stack: SERIF },
    yujisyuku: { label: "Yuji Syuku（筆）", family: "Yuji Syuku", weights: [400], stack: SERIF },
    yujiboku: { label: "Yuji Boku（筆）", family: "Yuji Boku", weights: [400], stack: SERIF },
    zenantique: { label: "Zen Antique（活版）", family: "Zen Antique", weights: [400], stack: SERIF },
    kurenaido: { label: "Zen Kurenaido", family: "Zen Kurenaido", weights: [400], stack: SANS },
    orbitron: { label: "Orbitron（英数・SF）", family: "Orbitron", weights: [400, 500, 700, 800, 900], stack: SANS },
    rajdhani: { label: "Rajdhani（英数・細身）", family: "Rajdhani", weights: [400, 500, 600, 700], stack: SANS },
    oswald: { label: "Oswald（英数・縦長）", family: "Oswald", weights: [400, 500, 600, 700], stack: SANS },
    sharetech: { label: "Share Tech Mono（英数・等幅）", family: "Share Tech Mono", weights: [400], stack: SANS },
    chakra: { label: "Chakra Petch（英数・角）", family: "Chakra Petch", weights: [400, 500, 600, 700], stack: SANS },
    teko: { label: "Teko（英数・縦長）", family: "Teko", weights: [400, 500, 600, 700], stack: SANS },
    bebas: { label: "Bebas Neue（英数・見出し）", family: "Bebas Neue", weights: [400], stack: SANS },
    russo: { label: "Russo One（英数・太）", family: "Russo One", weights: [400], stack: SANS },
    pressstart: { label: "Press Start 2P（英数・ドット）", family: "Press Start 2P", weights: [400], stack: SANS },
    silkscreen: { label: "Silkscreen（英数・ドット）", family: "Silkscreen", weights: [400, 700], stack: SANS },
    vt323: { label: "VT323（英数・端末）", family: "VT323", weights: [400], stack: SANS },
    cinzel: { label: "Cinzel（英数・碑文）", family: "Cinzel", weights: [400, 500, 600, 700, 800, 900], stack: SERIF },
    cormorant: { label: "Cormorant Garamond（英数・古典）", family: "Cormorant Garamond", weights: [400, 500, 600, 700], stack: SERIF },
    barlowcond: { label: "Barlow Condensed（英数・細身）", family: "Barlow Condensed", weights: [400, 500, 600, 700, 800, 900], stack: SANS },
    yugothic: { label: "游ゴシック（PCのフォント）", family: "Yu Gothic UI", weights: null, stack: SANS },
    meiryo: { label: "メイリオ（PCのフォント）", family: "Meiryo", weights: null, stack: SANS },
    yumincho: { label: "游明朝（PCのフォント）", family: "Yu Mincho", weights: null, stack: SERIF },
  };

  const WEIGHTS = [[400, "標準"], [500, "やや太"], [600, "中太"], [700, "太"], [800, "極太"], [900, "最太"]];

  const PANEL_MODES = [["fixed", "ソースいっぱいの窓"], ["fit", "中身の大きさに合わせる"]];
  const ANCHORS = [["bottom", "下に寄せる"], ["top", "上に寄せる"]];
  const ORDERS = [["newBottom", "新しいものを下に"], ["newTop", "新しいものを上に"]];
  const TEXTURES = [["none", "なし"], ["paper", "古い紙"], ["grain", "ざらつき"], ["scanlines", "走査線"]];

  const TITLE_SOURCES = [["none", "出さない"], ["text", "自分で書いた文字"], ["tab", "開いているタブの名前"], ["textTab", "文字 ＋ タブの名前"]];
  const TITLE_STYLES = [["text", "文字だけ"], ["bar", "帯"], ["underline", "下線"], ["tab", "見出しタブ"], ["lines", "両側に線"]];
  const ALIGNS = [["left", "左"], ["center", "中央"], ["right", "右"]];

  const CARD_STYLES = [["card", "カード（1件ずつ箱）"], ["bubble", "吹き出し"], ["plain", "箱なし"]];
  const ACCENTS = [["none", "なし"], ["char", "キャラの色"], ["fixed", "決まった色"], ["result", "ダイスの成否の色"]];
  const AVATAR_SHAPES = [["square", "四角"], ["rounded", "角丸"], ["circle", "丸"]];
  const AVATAR_ALIGNS = [["top", "上に揃える"], ["center", "中央に揃える"]];

  const NAME_COLORS = [["char", "キャラの色"], ["fixed", "決まった色"]];
  const NAME_STYLES = [["text", "文字だけ"], ["underline", "下線（キャラの色）"], ["badge", "ラベル（キャラの色）"], ["colon", "「名前：」と本文に続ける"]];
  const OUTLINES = [["shadow", "ぼかした影"], ["stroke", "ふちどり"], ["glow", "光る"], ["none", "なし"]];

  const RESULT_STYLES = [["text", "文字だけ"], ["badge", "枠で囲む"], ["fill", "色の帯"]];

  const ENTERS = [
    ["none", "なし"], ["fade", "ふわっと出る"], ["slideUp", "下から"], ["slideDown", "上から"],
    ["slideLeft", "右から"], ["slideRight", "左から"], ["pop", "ポンと出る"], ["blur", "ぼかしから"],
  ];

  // Dice result colors are emotion classes: css-<hash of the Typography styles>. Computed with the
  // hash function in CCFOLIA's bundle (2026-09-15) and matching classes used by existing OBS CSS.
  //   body2 + primary.main #2196f3   -> success (成功 / スペシャル / roll.success)
  //   body2 + secondary.main #dc004e -> failure (失敗 / roll.failure)
  //   body2 + text.secondary         -> anything else
  const RESULT_CLASS = { success: "css-1l6qhgm", failure: "css-1j13mke", neutral: "css-ucj12" };

  // The look of the default design. Other designs are patches over this.
  const BASE_LOOK = {
    panel: { mode: "fit", anchor: "bottom", margin: 10, pad: 10, bg: "#0c0e14", bgAlpha: 0.7, borderW: 1, borderColor: "#ffffff", borderAlpha: 0.14,
      radius: 10, shadow: 0.35, texture: "none", corners: false, cornerColor: "#ffffff", cornerAlpha: 0.8 },
    title: { source: "none", text: "DICE", style: "text", font: "notosans", weight: 700, size: 14, color: "#f2efe6", accent: "#c8a45c",
      bg: "#000000", bgAlpha: 0.45, align: "left", gap: 8, lock: true },
    list: { count: 5, order: "newBottom", diceOnly: false, hideSystem: true, gap: 6 },
    // Icons of the users in a private tab (CCFOLIA shows them in the chat header).
    members: { show: false, size: 24, spacing: -6, ringW: 2, ringColor: "#121212", ringAlpha: 1, label: "", labelSize: 12 },
    card: { style: "card", bg: "#000000", bgAlpha: 0.35, borderW: 0, borderColor: "#ffffff", borderAlpha: 0.2, radius: 8, padX: 10, padY: 8,
      shadow: 0, accent: "none", accentColor: "#c8a45c", accentW: 3, divider: false, dividerColor: "#ffffff", dividerAlpha: 0.15, resultBorder: false },
    avatar: { show: true, size: 36, shape: "rounded", borderW: 0, borderColor: "#ffffff", borderAlpha: 0.5, gap: 10, align: "top" },
    name: { show: true, font: "notosans", weight: 700, size: 13, colorMode: "char", color: "#f2efe6", style: "text",
      time: false, timeColor: "#ffffff", timeAlpha: 0.5, gap: 2 },
    text: { font: "notosans", weight: 400, size: 15, color: "#f2efe6", lineHeight: 1.55, spacing: 0.02,
      outline: "shadow", outlineColor: "#000000", outlineAlpha: 0.8, outlineW: 2, clamp: 0 },
    result: { font: "notosans", weight: 700, size: 16, newLine: true, style: "text",
      success: "#5cc8ff", failure: "#ff5c7a", neutral: "#e8e4da", glow: false, flash: false },
    motion: { enter: "slideUp", enterDur: 0.35, exit: false, exitAfter: 12, exitDur: 0.6 },
  };

  const DESIGNS = {
    dicebox: {
      label: "ダイスウィンドウ（標準）", desc: "ダイスの結果だけを新しい順に4件。左の線が成功は青、失敗は赤に変わります。",
      title: { source: "text", text: "DICE ROLL", style: "underline", font: "chakra", size: 13, color: "#cfd6e6", accent: "#5cc8ff" },
      list: { count: 4, diceOnly: true },
      card: { bg: "#10131b", bgAlpha: 0.82, radius: 6, accent: "result", accentColor: "#8a93a8", accentW: 4, padX: 12 },
      avatar: { size: 34 },
      text: { size: 13, color: "#aeb6c8", outline: "none" },
      result: { font: "chakra", size: 19, weight: 700 },
      motion: { enter: "slideLeft", enterDur: 0.35 },
    },
    dicepop: {
      label: "ダイス速報（1件を大きく）", desc: "最新のダイスを1件だけ大きく出して、10秒で消えます。立ち絵の近くに置く使い方に。",
      panel: { bgAlpha: 0, borderW: 0, shadow: 0, pad: 4 },
      list: { count: 1, diceOnly: true },
      card: { bg: "#08090d", bgAlpha: 0.86, radius: 14, borderW: 2, borderColor: "#ffffff", borderAlpha: 0.2, padX: 16, padY: 12, shadow: 0.5, resultBorder: true },
      avatar: { size: 64, shape: "rounded", gap: 14, align: "center" },
      name: { size: 15, style: "badge" },
      text: { size: 14, color: "#d4d0c6", outline: "none" },
      result: { font: "mplusround", weight: 800, size: 26, style: "text", glow: true, flash: true },
      motion: { enter: "pop", enterDur: 0.45, exit: true, exitAfter: 10, exitDur: 0.6 },
    },
    secretLetter: {
      label: "秘匿チャット（手紙）", desc: "生成りの紙に明朝体。見出しに秘匿タブの名前が入ります。",
      panel: { mode: "fixed", bg: "#efe4cb", bgAlpha: 0.97, borderW: 1, borderColor: "#6b5130", borderAlpha: 0.7, radius: 3, pad: 16, texture: "paper", shadow: 0.45 },
      title: { source: "tab", style: "lines", font: "shippori", weight: 700, size: 17, color: "#3a2a1a", accent: "#6b5130", align: "center", gap: 10 },
      members: { show: true, size: 24, spacing: 4, ringW: 1, ringColor: "#6b5130", ringAlpha: 0.7, label: "宛先", labelSize: 12 },
      list: { count: 12, gap: 0 },
      card: { style: "plain", padX: 2, padY: 9, divider: true, dividerColor: "#6b5130", dividerAlpha: 0.3 },
      avatar: { size: 32, shape: "circle", borderW: 1, borderColor: "#6b5130", borderAlpha: 0.6 },
      name: { font: "shippori", size: 13, colorMode: "fixed", color: "#6b3b22", time: true, timeColor: "#3a2a1a", timeAlpha: 0.45 },
      text: { font: "shippori", weight: 500, size: 15, color: "#2e2116", lineHeight: 1.75, outline: "none" },
      result: { font: "shippori", size: 15, success: "#1f4e8a", failure: "#8a1f1f", neutral: "#4a3a2a" },
      motion: { enter: "fade", enterDur: 0.6 },
    },
    secretHud: {
      label: "秘匿通信（SF）", desc: "暗い画面に水色の線と走査線。「SECRET」の後ろにタブの名前を出します。",
      panel: { mode: "fixed", bg: "#03101a", bgAlpha: 0.88, borderW: 1, borderColor: "#6ff3ff", borderAlpha: 0.55, radius: 0, pad: 12,
        texture: "scanlines", shadow: 0, corners: true, cornerColor: "#6ff3ff", cornerAlpha: 0.95 },
      title: { source: "textTab", text: "SECRET // ", style: "bar", font: "chakra", size: 13, color: "#dffbff", bg: "#6ff3ff", bgAlpha: 0.16, gap: 10 },
      members: { show: true, size: 22, spacing: 3, ringW: 1, ringColor: "#6ff3ff", ringAlpha: 0.8, label: "ACCESS", labelSize: 11 },
      list: { count: 10, gap: 5 },
      card: { bg: "#6ff3ff", bgAlpha: 0.05, radius: 0, borderW: 1, borderColor: "#6ff3ff", borderAlpha: 0.18, accent: "char", accentW: 3, padY: 7 },
      avatar: { size: 32, shape: "square", borderW: 1, borderColor: "#6ff3ff", borderAlpha: 0.6 },
      name: { font: "chakra", size: 13 },
      text: { font: "zenkaku", size: 14, color: "#dffbff", outline: "glow", outlineColor: "#00c8ff", outlineAlpha: 0.35 },
      result: { font: "rajdhani", size: 19, success: "#63ffa8", failure: "#ff5a78", neutral: "#dffbff", glow: true },
      motion: { enter: "slideRight", enterDur: 0.3 },
    },
    simple: {
      label: "チャットログ（背景なし）", desc: "箱を出さず、ふちどりした文字だけ。画面の端に重ねても邪魔になりません。",
      panel: { mode: "fixed", bgAlpha: 0, borderW: 0, shadow: 0, pad: 6 },
      list: { count: 8, gap: 4 },
      card: { style: "plain", padX: 0, padY: 3 },
      avatar: { size: 28, shape: "circle" },
      name: { style: "colon", size: 15 },
      text: { size: 15, weight: 700, outline: "stroke", outlineColor: "#000000", outlineAlpha: 0.9, outlineW: 2 },
      result: { newLine: false, size: 15, weight: 800 },
      motion: { enter: "fade", enterDur: 0.4 },
    },
    bubble: {
      label: "吹き出し", desc: "アイコンの横に白い吹き出し。やわらかい丸ゴシックで、日常ものの卓に。",
      panel: { bgAlpha: 0, borderW: 0, shadow: 0, pad: 4 },
      list: { count: 4, gap: 10 },
      card: { style: "bubble", bg: "#ffffff", bgAlpha: 0.95, radius: 14, padX: 12, padY: 8, shadow: 0.3 },
      avatar: { size: 44, shape: "circle", borderW: 2, borderColor: "#ffffff", borderAlpha: 1 },
      name: { font: "zenmaru", size: 12, style: "text" },
      text: { font: "zenmaru", weight: 500, size: 15, color: "#3a3440", outline: "none" },
      result: { font: "zenmaru", size: 16, style: "fill", success: "#2f8fe0", failure: "#e0456a", neutral: "#6a6470" },
      motion: { enter: "pop", enterDur: 0.4 },
    },
    rpg: {
      label: "RPG のメッセージ窓", desc: "黒い窓に白い二重枠、ドット文字。昔のゲームの会話ウィンドウ風。",
      panel: { mode: "fixed", anchor: "top", bg: "#000000", bgAlpha: 0.9, borderW: 3, borderColor: "#ffffff", borderAlpha: 1, radius: 6, pad: 14, shadow: 0 },
      list: { count: 4, gap: 6 },
      card: { style: "plain", padX: 0, padY: 2 },
      avatar: { show: false },
      name: { font: "dotgothic", weight: 400, size: 16, colorMode: "fixed", color: "#ffe066", style: "colon" },
      text: { font: "dotgothic", weight: 400, size: 16, color: "#ffffff", lineHeight: 1.6, spacing: 0.04, outline: "none" },
      result: { font: "dotgothic", weight: 400, size: 16, newLine: false, success: "#6fd3ff", failure: "#ff6b6b", neutral: "#ffffff" },
      motion: { enter: "none" },
    },
    horror: {
      label: "ホラー", desc: "黒ずんだ赤と筆文字。ぼかしから浮かび上がり、しばらくすると消えていきます。",
      panel: { mode: "fixed", bg: "#050203", bgAlpha: 0.8, borderW: 1, borderColor: "#6a0f0f", borderAlpha: 0.8, radius: 2, texture: "grain", shadow: 0.6 },
      list: { count: 6, gap: 8 },
      card: { style: "plain", padX: 4, padY: 4, divider: true, dividerColor: "#6a0f0f", dividerAlpha: 0.5 },
      avatar: { size: 34, shape: "square", borderW: 1, borderColor: "#6a0f0f", borderAlpha: 0.9 },
      name: { font: "yujiboku", weight: 400, size: 14, colorMode: "fixed", color: "#c9a8a0" },
      text: { font: "zenantique", size: 16, color: "#eadad6", outline: "glow", outlineColor: "#4a0000", outlineAlpha: 1 },
      result: { font: "zenantique", size: 17, success: "#d8d0c0", failure: "#ff2a2a", neutral: "#c9b3ad", glow: true },
      motion: { enter: "blur", enterDur: 1.2, exit: true, exitAfter: 20, exitDur: 1.5 },
    },
    archive: {
      label: "古文書（探索記録）", desc: "黄ばんだ紙に墨の文字。ダイスの結果には朱で枠が付きます。",
      panel: { mode: "fit", bg: "#e6d8b8", bgAlpha: 0.96, borderW: 1, borderColor: "#5a4326", borderAlpha: 0.8, radius: 2, pad: 14, texture: "paper",
        corners: true, cornerColor: "#5a4326", cornerAlpha: 0.85 },
      title: { source: "text", text: "探索記録", style: "underline", font: "shippori", weight: 800, size: 18, color: "#2b2118", accent: "#7a1f1a" },
      list: { count: 4, gap: 2 },
      card: { style: "plain", padX: 2, padY: 6, divider: true, dividerColor: "#5a4326", dividerAlpha: 0.35 },
      avatar: { show: false },
      name: { font: "shippori", weight: 800, size: 14, colorMode: "fixed", color: "#5a2a18" },
      text: { font: "shippori", weight: 500, size: 15, color: "#2b2118", outline: "none" },
      result: { font: "shippori", weight: 700, size: 15, style: "badge", success: "#1f3f6e", failure: "#8a1a1a", neutral: "#3b2a18" },
      motion: { enter: "fade", enterDur: 0.8 },
    },
  };

  // ---------------------------------------------------------------- sample messages (preview only)

  // hair / clothes colors feed the sample avatars drawn in mock.v1.js
  const SPEAKERS = {
    kp: { name: "KP", color: "#d9d4c7", hair: "#2c2a30", cloth: "#4a4658" },
    hinata: { name: "朝霧 ひなた", color: "#ffb74d", hair: "#8a5a3a", cloth: "#b8433f" },
    ren: { name: "黒崎 蓮", color: "#6fb6ff", hair: "#1e2433", cloth: "#2f4f7a" },
    shizuku: { name: "白瀬 しずく", color: "#c39cf0", hair: "#d8d4e8", cloth: "#5f4a8a" },
    system: { name: "", color: "" },
  };

  // kind: chat | success | failure | neutral | system | secret (someone else's secret dice)
  const SAMPLE_MESSAGES = {
    main: [
      // CCFOLIA posts "/system [ name ] label : old → new" when a status changes (":HP-2" etc.); "/system " is stripped.
      { who: "system", kind: "system", text: "[ 黒崎 蓮 ] HP : 12 → 10" },
      { who: "kp", kind: "chat", text: "門をくぐると、雨に濡れた洋館が目の前に建っている。" },
      { who: "hinata", kind: "success", text: "CC<=65 【目星】", result: "(1D100<=65) ＞ 23 ＞ 成功" },
      { who: "ren", kind: "failure", text: "CC<=40 【聞き耳】", result: "(1D100<=40) ＞ 88 ＞ 失敗" },
      { who: "shizuku", kind: "chat", text: "玄関の扉、少しだけ開いてませんか……？" },
      { who: "kp", kind: "neutral", text: "1D6 【ダメージ】", result: "(1D6) ＞ 4" },
      { who: "ren", kind: "success", text: "CC<=70 【図書館】", result: "(1D100<=70) ＞ 1 ＞ 決定的成功/スペシャル" },
      // SAN checks have no critical / fumble, so a plain 1D100 roll.
      { who: "hinata", kind: "failure", text: "1D100<=55 【SANチェック】", result: "(1D100<=55) ＞ 97 ＞ 失敗" },
    ],
    secret: [
      { who: "kp", kind: "chat", text: "（朝霧さんにだけ伝えます）あなたは、この洋館に見覚えがある。" },
      { who: "hinata", kind: "chat", text: "……子どもの頃、ここに来たことがある？" },
      { who: "kp", kind: "success", text: "CC<=50 【アイデア】", result: "(1D100<=50) ＞ 12 ＞ 成功" },
      { who: "kp", kind: "chat", text: "思い出す。地下室の鍵は、暖炉の灰の中に隠されていた。" },
      { who: "hinata", kind: "chat", text: "みんなには、まだ黙っておこう。" },
    ],
  };

  const SAMPLE_TABS = {
    main: { label: "メイン", private: false },
    secret: { label: "朝霧さん秘匿", private: true },
  };

  // Lines added by the "send" buttons, in turn.
  const EXTRA_MESSAGES = {
    chat: [
      { who: "shizuku", text: "今の音、上の階から聞こえませんでした？" },
      { who: "ren", text: "慎重に進もう。明かりはまだ持ってる。" },
      { who: "kp", text: "廊下の奥で、何かが床をこする音がした。" },
      { who: "hinata", text: "ちょっと、長いメッセージだとどう見えるか試してみます。二行、三行と折り返しても読みやすいかどうか、ここで確かめてください。" },
    ],
    success: [
      { who: "shizuku", text: "CC<=60 【応急手当】", result: "(1D100<=60) ＞ 41 ＞ 成功" },
      { who: "ren", text: "CCB<=75 【回避】", result: "(1D100<=75) ＞ 5 ＞ 決定的成功/スペシャル" },
    ],
    failure: [
      { who: "hinata", text: "CC<=45 【忍び歩き】", result: "(1D100<=45) ＞ 77 ＞ 失敗" },
      { who: "shizuku", text: "CCB<=30 【オカルト】", result: "(1D100<=30) ＞ 98 ＞ 致命的失敗" },
    ],
    neutral: [
      { who: "kp", text: "1D3 【SAN減少】", result: "(1D3) ＞ 2" },
      { who: "ren", text: "2D6", result: "(2D6) ＞ 9[4,5] ＞ 9" },
    ],
    system: [
      { who: "system", text: "[ 朝霧 ひなた ] SAN : 55 → 52" },
      { who: "system", text: "[ room ] 経過日数 : 1 → 2" },
    ],
    secret: [
      { who: "shizuku", text: "Secret dice 🎲" },
    ],
  };

  window.ChatPresets = {
    FONTS, WEIGHTS, PANEL_MODES, ANCHORS, ORDERS, TEXTURES, TITLE_SOURCES, TITLE_STYLES, ALIGNS,
    CARD_STYLES, ACCENTS, AVATAR_SHAPES, AVATAR_ALIGNS, NAME_COLORS, NAME_STYLES, OUTLINES, RESULT_STYLES, ENTERS,
    RESULT_CLASS, BASE_LOOK, DESIGNS, SPEAKERS, SAMPLE_MESSAGES, SAMPLE_TABS, EXTRA_MESSAGES,
  };
})();
