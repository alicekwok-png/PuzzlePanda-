/* ==========================================================================
   --app-h：真正睇得到嘅高度
   --------------------------------------------------------------------------
   點解唔直接用 100svh
   ----------------------
   用戶報過首頁「走咗位」：iOS Safari 開咗 Google 翻譯，頂部多咗一條翻譯
   橫額。svh 係「瀏覽器 chrome 全部顯示嗰陣嘅高度」，但佢唔計呢種額外
   chrome，所以 100svh 大過真正睇得到嘅範圍。後果係：

     · 成頁變到捲得動，一碌低就切走首頁頂部 —— 設定齒輪唔見咗，貼紙簿
       同每日兩個入口淨返下半截（呢兩個係 position: absolute 貼喺
       .screen 上面，會跟住捲走）；
     · 反過嚟鎖死 document 唔畀捲又唔得 —— 關卡選擇嘅章節格喺矮螢幕
       本來就係靠成頁捲先睇到下面幾章。

   所以唔可以淨係靠 CSS 單位。呢度用 window.innerHeight（＝瀏覽器實際
   畀我哋嘅內容高度，翻譯橫額、網址列縮放全部計晒）寫落 --app-h，畫面
   高度跟住佢行。咁樣 .screen 就啱啱好等於可視區，入面 overflow-y: auto
   嗰啲區域先真係捲得起上嚟，而唔係推長成份 document。

   ⚠️ 用 innerHeight 唔用 visualViewport.height：夾手指放大或者（將來）
   彈鍵盤嗰陣 visualViewport 會縮，跟住佢行成個版面會跳。innerHeight
   只跟瀏覽器 chrome 變，正正係我哋要嘅嘢。
   ========================================================================== */

function apply() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
}

export function startViewportHeightSync() {
  if (typeof window === 'undefined') return;
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  /* 由 bfcache 返返嚟（Safari 上一頁／下一頁）唔會派 resize，但期間
     chrome 可能已經變咗。 */
  window.addEventListener('pageshow', apply);
  /* iOS 收／放網址列、彈翻譯橫額嗰陣未必會派 window resize，但
     visualViewport 一定會派 resize 或者 scroll。只借佢哋做觸發，實際
     數值照樣讀 innerHeight（見上面點解唔讀 visualViewport.height）。 */
  window.visualViewport?.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('scroll', apply);
}
