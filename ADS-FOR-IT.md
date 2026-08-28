# 廣告接入說明（給 IT 部同事）

這份文件講清楚：**廣告位在哪、怎麼接、不要動什麼**。

專案是 React + Vite，用 Capacitor 打包成 iOS / Android app 上架。
廣告框架已經接好（`@capacitor-community/admob`），你們只需要換 ID、加 native 設定。

---

## 一、最短路徑：只要做這三件事

1. **換廣告單位 ID** — 只改 `src/services/ads.js` 最上面的 `AD_UNITS`。
2. **加 native 設定** — AdMob App ID 要寫進 Android / iOS 的原生設定（見第五節）。
3. **關掉測試模式** — `ads.js` 裡 `initializeForTesting: true` 改成 `false`。

其餘畫面程式碼都不用動。

---

## 二、廣告版位一覽

| # | 版位 ID | 格式 | 位置 | 觸發時機 | 建議 |
|---|---------|------|------|----------|------|
| 1 | `game-bottom-banner` | Banner | 遊戲畫面最底 | 進入關卡時常駐 | 填充率最高，先上這個 |
| 2 | `chapterselect-bottom-banner` | Banner | 主題章節頁最底 | 進入頁面常駐 | 同上 |
| 3 | `levelselect-bottom-banner` | Banner | 關卡選擇頁最底 | 進入頁面常駐 | 同上 |
| 4 | `levelselect-native-card` | Native | 關卡格線第 6 格 | 頁面載入 | 一章 5 關 + 這張卡剛好補滿 3 欄；尺寸自動等同關卡卡（1:1） |
| 5 | （插頁） | Interstitial | 全螢幕 | 離開過關結算畫面時 | 已設頻率上限，見第四節 |
| 6 | （獎勵式） | Rewarded | 「看片換提示」按鈕 | 提示用完時玩家主動點 | **eCPM 最高，強烈建議做**；第 13 關起每關只有 1 次提示，這個入口會很常被點 |
| 7 | （開屏） | App Open | 全螢幕 | App 冷啟動 | 想壓低干擾可先不開 |

橫幅由 `src/App.jsx` 依畫面統一開關：**首頁不顯示**（首頁沒有預留高度，橫幅會蓋住「開始遊戲」按鈕），其餘畫面顯示。

### 版位 1–3 的接法（DOM 掛載式）

畫面上這三個版位由 `src/components/AdSlot.jsx` 產生，長這樣：

```html
<div class="ad-slot ad-slot--banner"
     data-ad-slot="game-bottom-banner"
     data-ad-format="banner"
     data-ad-filled="false">
  <div class="ad-slot__mount" data-ad-mount="game-bottom-banner"></div>
  <span class="ad-slot__placeholder">橫幅廣告版位</span>
</div>
```

要塞任何廣告（AdMob 原生 view、AdSense、自家廣告、第三方 SDK）：

```js
const mount = document.querySelector('[data-ad-mount="game-bottom-banner"]');
mount.appendChild(yourAdElement);
mount.closest('.ad-slot').dataset.adFilled = 'true';  // 佔位字樣自動隱藏
```

### 版位 4–6 的接法（函式呼叫式）

這三種是全螢幕或影片，不佔版面，直接呼叫 `src/services/ads.js`：

```js
import { showInterstitialOnLevelWin, showRewarded, showAppOpenAd } from './services/ads';
```

`showRewarded()` 回傳 `true` 代表玩家看完，呼叫端才發獎勵 —— 已經接在「看片換提示」按鈕上。

---

## 三、⚠️ 版面上不要做的事

**廣告位的高度是刻意寫死保留的**，寫在 `src/index.css`：

```css
:root { --ad-banner-h: 56px; }   /* 橫向模式自動改成 44px */
```

這樣廣告載入前後版面完全不跳動（避免 CLS，也避免廣告蓋住底部工具列）。

- ❌ 不要把 `.ad-slot` 改成 `position: fixed` 或 `absolute`
- ❌ 不要為了塞廣告去改 `.game-body` / `.board-wrap` 的 flex 結構
- ❌ 不要移除 `--ad-banner-h` 的保留高度
- ✅ 要換廣告尺寸，只改 `--ad-banner-h` 這個變數

AdMob 的原生 banner 是浮在 WebView **之上**的，保留高度就是為了讓它有地方站、不蓋住「復原 / 提示 / 重新開始」三個按鈕。已驗證：直向 375×812 下工具列底部 756px、廣告位頂部 756px，零重疊。

---

## 四、投放頻率（改這裡就好，不用動畫面）

`src/services/ads.js` 的 `AD_POLICY`：

```js
export const AD_POLICY = {
  interstitialEveryNWins: 2,   // 每 2 關彈一次插頁
  interstitialMinGapSec: 45,   // 兩次插頁至少隔 45 秒
  bannerInGame: true,          // 是否顯示橫幅
  nativeInLevelGrid: true,     // 關卡格線是否插原生廣告卡
};
```

全遊戲共 50 關（10 章 × 5 關）。以 `interstitialEveryNWins: 2` 計，玩家從頭玩到尾約會看到 25 次插頁 —— 覺得太密就調成 3。

**插頁廣告目前設定在「離開過關結算畫面」時彈，不是一過關就彈。**
理由：讓玩家先看到自己完成的照片再進廣告，留存明顯較好。
想改回過關即彈，把 `GameScreen.jsx` 裡 `leaveWin()` 的呼叫搬到 `WinModal` 掛載時即可。

---

## 五、上架前必做

1. 在你們自己的 [AdMob](https://admob.google.com/) 開 App 與各廣告單位，把 ID 填進 `AD_UNITS`。
   目前填的是 **Google 官方公開測試 ID**，開發階段安全；
   ⚠️ 開發時不要換成真 ID 自己點，會被判定無效流量而停權。
2. `ads.js` 的 `initializeForTesting: true` → `false`。
3. **Android** — `android/app/src/main/AndroidManifest.xml` 加：
   ```xml
   <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
              android:value="ca-app-pub-你的AdMob-App-ID"/>
   ```
4. **iOS** — `ios/App/App/Info.plist` 加 `GADApplicationIdentifier` 與 `SKAdNetworkItems`。
5. `capacitor.config.json` 的 `appId` 從 `com.example.jigsawsolitaire` 換成你們的正式 Bundle ID。
6. 兩家商店都要填「App 內含廣告」聲明與私隱政策連結。

以上 3–5 步一定要在加了 native platform（`npm run cap:add:android` / `cap:add:ios`）之後、在你們自己的電腦上做。

---

## 六、開發時看不到廣告是正常的

`Capacitor.isNativePlatform()` 在瀏覽器是 `false`，所有廣告函式自動變成 no-op，
不會報錯也不會擋玩家。要看到真廣告，一定要打包成真 app 跑在手機或模擬器上。

版面上的虛線框與「廣告版位」字樣就是佔位提示，接上廣告後（`data-ad-filled="true"`）會自動消失。
