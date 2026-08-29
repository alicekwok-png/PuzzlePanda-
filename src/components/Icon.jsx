/* ==========================================================================
   介面圖示
   --------------------------------------------------------------------------
   ⚠️ 全個 App 唔准出現 emoji 做 UI 圖示（產品負責人明確要求）。
   emoji 會跟住系統字型變樣 —— iOS、Android、Windows 三邊畫出嚟完全唔同，
   而且係彩色卡通風，擺喺遊戲介面度一睇就知係網頁，唔似 native app。

   全部圖示喺呢度用 inline SVG 畫，統一 24×24 viewBox、stroke 用
   currentColor，所以顏色由 CSS 話事（.icon-btn 白色、.is-armed 深色⋯⋯）。

   已經有 PNG 素材嗰幾個（back / undo / hint / peek）唔喺呢度 —— 佢哋係
   設計交付嘅資產，繼續用 public/icons/*.png。呢度只補齊冇素材嗰啲。
   ========================================================================== */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const SOLID = { fill: 'currentColor', stroke: 'none' };

const ICONS = {
  /* 齒輪。⚠️ 八條齒一定要由輪圈裏面起，同輪圈駁埋 —— 試過由圈外面起，
     出嚟似個太陽唔似齒輪。齒亦要粗過輪圈先讀得到係「齒」。 */
  gear: {
    attrs: STROKE,
    body: (
      <>
        <path
          strokeWidth="3"
          d="M12 5.8V2.4M12 18.2v3.4M18.2 12h3.4M5.8 12H2.4M16.38 7.62l2.41-2.41M7.62 16.38l-2.41 2.41M16.38 16.38l2.41 2.41M7.62 7.62L5.21 5.21"
        />
        <circle cx="12" cy="12" r="6.6" />
        <circle cx="12" cy="12" r="3.1" />
      </>
    ),
  },
  close: { attrs: STROKE, body: <path d="M6 6l12 12M18 6L6 18" /> },
  check: { attrs: { ...STROKE, strokeWidth: 2.6 }, body: <path d="M4.5 12.5l5 5 10-11" /> },
  lock: {
    attrs: STROKE,
    body: (
      <>
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" />
        <path d="M8 10.5V7.8a4 4 0 018 0v2.7" />
      </>
    ),
  },
  soundOn: {
    attrs: STROKE,
    body: (
      <>
        <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
        <path d="M15.6 9.2a4 4 0 010 5.6M18.4 6.6a7.8 7.8 0 010 10.8" />
      </>
    ),
  },
  soundOff: {
    attrs: STROKE,
    body: (
      <>
        <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" />
        <path d="M16 9.8l4.4 4.4M20.4 9.8L16 14.2" />
      </>
    ),
  },
  // 實心五角星：進度條上面粒旋鈕
  star: {
    attrs: SOLID,
    body: <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />,
  },
  // 四角閃光：砌啱一塊嗰下嘅特效
  sparkle: {
    attrs: SOLID,
    body: <path d="M12 2l2.1 6.4L20.5 12l-6.4 2.1L12 20.5l-2.1-6.4L3.5 12l6.4-2.1z" />,
  },
  // 播放中嘅影片框：「睇廣告換提示」
  video: {
    attrs: STROKE,
    body: (
      <>
        <rect x="2.6" y="5.5" width="18.8" height="13" rx="3" />
        <path d="M10.2 9.6l4.6 2.9-4.6 2.9z" />
      </>
    ),
  },
  /* 重新開始 = 打散重砌（resetLevel 係 generateBoard 出一副全新亂序，
     唔係還原做原本個排列）。所以用「交叉兩支箭」嘅打亂圖示。

     ⚠️ 千祈唔好改返用圓圈箭嘴 —— 隔籬「復原」就係圓圈箭嘴，兩個擺埋
     一齊玩家會當佢哋係同一樣嘢（產品負責人喺實機上面就係咁撈亂咗）。
     呢個圖示嘅輪廓要同圓圈箭嘴完全唔同先得。 */
  shuffle: {
    attrs: STROKE,
    body: (
      <>
        <path d="M3.5 6.5h3.2c1.15 0 2.2.6 2.85 1.6l4 6.3c.65 1 1.7 1.6 2.85 1.6h3.1" />
        <path d="M3.5 17.5h3.2c1.15 0 2.2-.6 2.85-1.6l1.3-2.05" />
        <path d="M13.15 10.15l1.3-2.05c.65-1 1.7-1.6 2.85-1.6h3.1" />
        <path d="M17.6 3.9l2.6 2.6-2.6 2.6" />
        <path d="M17.6 13.4l2.6 2.6-2.6 2.6" />
      </>
    ),
  },
  // 月曆：每日任務入口
  calendar: {
    attrs: STROKE,
    body: (
      <>
        <rect x="3.2" y="5" width="17.6" height="16" rx="3" />
        <path d="M3.2 10h17.6M8 3v4M16 3v4" />
        <path d="M8 14.5h2.4M13.6 14.5H16M8 17.8h2.4M13.6 17.8H16" />
      </>
    ),
  },
  // 燈膽：提示（每日任務獎勵）
  bulb: {
    attrs: STROKE,
    body: (
      <>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5a5.5 5.5 0 1 0-9 0c.8.8 1.3 1.5 1.5 2.5" />
        <path d="M9.2 17.6h5.6M10.2 20.8h3.6" />
      </>
    ),
  },
  chevronLeft: { attrs: { ...STROKE, strokeWidth: 2.4 }, body: <path d="M15 5l-7 7 7 7" /> },
  chevronRight: { attrs: { ...STROKE, strokeWidth: 2.4 }, body: <path d="M9 5l7 7-7 7" /> },
  // 環圈裝訂 + 揭起右上角嘅簿：貼紙簿
  album: {
    attrs: STROKE,
    body: (
      <>
        <path d="M7 4h9l4 4v12H7z" />
        <path d="M16 4v4h4" />
        <path d="M3.6 7.4h5M3.6 12h5M3.6 16.6h5" />
      </>
    ),
  },
};

export default function Icon({ name, className = '' }) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`未知圖示：${name}`);
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...icon.attrs}
    >
      {icon.body}
    </svg>
  );
}
