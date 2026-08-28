/* ==========================================================================
   AdSlot —— 統一的廣告容器
   --------------------------------------------------------------------------
   給 IT 同事：
   這個元件只負責「在版面上預留一塊固定大小的空間」，不負責載入廣告。

   每個 slot 都會產出這樣的 DOM：

     <div class="ad-slot ad-slot--banner"
          data-ad-slot="game-bottom-banner"
          data-ad-format="banner"
          data-ad-filled="false">
       <div class="ad-slot__mount" data-ad-mount="game-bottom-banner"></div>
       <span class="ad-slot__placeholder">廣告版位</span>
     </div>

   要接任何廣告平台（AdMob 原生 view、AdSense、自家廣告、第三方 SDK），
   只要用 data-ad-mount 的值抓到節點，把廣告塞進去，然後把外層的
   data-ad-filled 設成 "true" 就會自動隱藏佔位字樣：

     const el = document.querySelector('[data-ad-mount="game-bottom-banner"]');
     el.appendChild(yourAdView);
     el.closest('.ad-slot').dataset.adFilled = 'true';

   ⚠️ 高度是寫死保留的（--ad-banner-h），廣告載入前後版面都不會跳動。
   不要為了塞廣告去改遊戲版面的 flex 結構。

   全部版位清單見 ADS-FOR-IT.md。
   ========================================================================== */

// label 由呼叫端傳入已翻譯好的文字（見 src/locales/*.json 的 ads.* key）。
// 這裡不放預設中文，免得漏傳時繞過 i18n。
export default function AdSlot({ id, format = 'banner', label = '', className = '' }) {
  return (
    <div
      className={`ad-slot ad-slot--${format} ${className}`.trim()}
      data-ad-slot={id}
      data-ad-format={format}
      data-ad-filled="false"
      aria-hidden="true"
    >
      <div className="ad-slot__mount" data-ad-mount={id} />
      <span className="ad-slot__placeholder">{label}</span>
    </div>
  );
}
