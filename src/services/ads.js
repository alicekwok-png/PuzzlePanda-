/* ==========================================================================
   廣告服務 —— AdMob (@capacitor-community/admob) 封裝
   --------------------------------------------------------------------------
   給 IT 同事：這一份檔案是「唯一」要改的廣告檔。所有廣告單位 ID 集中在
   下面的 AD_UNITS，其餘畫面只透過 showBanner / showInterstitialOnLevelWin /
   showRewarded 這三個函式呼叫，不直接碰 SDK。

   重要行為：
   - 網頁 / 開發環境下 Capacitor.isNativePlatform() === false，所有函式
     自動變成 no-op，不會報錯，也不會擋住玩家。
   - 廣告失敗永遠不阻擋遊戲流程（showRewarded 失敗時回傳 false，呼叫端
     自行決定要不要照樣給獎勵）。
   - 插頁廣告有頻率上限，避免違反 AdMob 政策與傷害留存。
   ========================================================================== */
import { Capacitor } from '@capacitor/core';

/* --------------------------------------------------------------------------
   1. 廣告單位 ID —— IT 同事請把這裡換成你們 AdMob 後台的真實 ID
   --------------------------------------------------------------------------
   現在填的是 Google 官方公開測試 ID，開發階段可以安全使用。
   ⚠️ 開發時不要換成真 ID 自己點，會被 AdMob 判定無效流量而停權。
   -------------------------------------------------------------------------- */
export const AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    appOpen: 'ca-app-pub-3940256099942544/5662855259',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
  },
};

/* --------------------------------------------------------------------------
   2. 投放策略 —— 想調整廣告密度改這裡就好，不必動畫面程式
   -------------------------------------------------------------------------- */
export const AD_POLICY = {
  /** 每完成幾關彈一次插頁廣告。1 = 每關都彈（較傷留存），建議 2。 */
  interstitialEveryNWins: 2,
  /** 兩次插頁廣告之間至少要隔多少秒，避免連續轟炸。 */
  interstitialMinGapSec: 45,
  /** 遊戲中是否顯示底部橫幅。關掉的話版面會自動收起保留高度。 */
  bannerInGame: true,
  /** 關卡選擇頁是否插原生廣告卡（一章 5 關 + 廣告卡剛好補滿 3 欄格線）。 */
  nativeInLevelGrid: true,
};

const isNative = () => Capacitor.isNativePlatform();
const platform = () => (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android');
const unit = (kind) => AD_UNITS[platform()][kind];

let initPromise = null;
let winsSinceInterstitial = 0;
let lastInterstitialAt = 0;
let bannerVisible = false;

async function admob() {
  const mod = await import('@capacitor-community/admob');
  return mod.AdMob;
}

/** App 啟動時呼叫一次。 */
export function initAds() {
  if (!isNative()) return Promise.resolve();
  if (!initPromise) {
    initPromise = admob()
      .then((AdMob) =>
        AdMob.initialize({
          // 上架前把 initializeForTesting 改成 false，並清空 testingDevices
          initializeForTesting: true,
        }),
      )
      .catch((err) => console.warn('[ads] initialize failed', err));
  }
  return initPromise;
}

/* --------------------------------------------------------------------------
   橫幅廣告 (Banner)
   --------------------------------------------------------------------------
   畫面上已用 <AdSlot variant="banner" /> 預留固定高度，所以橫幅出現或消失
   都不會造成版面跳動 (CLS)。AdMob 的原生橫幅是覆蓋在 WebView 之上的，
   保留高度的用意就是不讓它蓋住底部工具列。
   -------------------------------------------------------------------------- */
export async function showBanner() {
  if (!isNative() || !AD_POLICY.bannerInGame || bannerVisible) return;
  try {
    await initAds();
    const { AdMob, BannerAdPosition, BannerAdSize } = await import('@capacitor-community/admob');
    await AdMob.showBanner({
      adId: unit('banner'),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true, // 上架前改成 false
    });
    bannerVisible = true;
  } catch (err) {
    console.warn('[ads] showBanner failed', err);
  }
}

export async function hideBanner() {
  if (!isNative() || !bannerVisible) return;
  try {
    const AdMob = await admob();
    await AdMob.hideBanner();
    bannerVisible = false;
  } catch (err) {
    console.warn('[ads] hideBanner failed', err);
  }
}

/* --------------------------------------------------------------------------
   插頁廣告 (Interstitial) —— 過關後
   -------------------------------------------------------------------------- */
export async function showInterstitialOnLevelWin() {
  winsSinceInterstitial += 1;
  if (!isNative()) return false;

  const dueByCount = winsSinceInterstitial >= AD_POLICY.interstitialEveryNWins;
  const dueByTime = (Date.now() - lastInterstitialAt) / 1000 >= AD_POLICY.interstitialMinGapSec;
  if (!dueByCount || !dueByTime) return false;

  try {
    await initAds();
    const AdMob = await admob();
    await AdMob.prepareInterstitial({ adId: unit('interstitial') });
    await AdMob.showInterstitial();
    winsSinceInterstitial = 0;
    lastInterstitialAt = Date.now();
    return true;
  } catch (err) {
    console.warn('[ads] interstitial failed', err);
    return false;
  }
}

/* --------------------------------------------------------------------------
   獎勵式廣告 (Rewarded) —— 玩家主動看廣告換道具
   --------------------------------------------------------------------------
   回傳 true 代表玩家「看完了」，呼叫端才發獎勵。
   非 native 環境回傳 false，呼叫端在開發時可自行放行。
   -------------------------------------------------------------------------- */
export async function showRewarded(placement = 'extra-hint') {
  if (!isNative()) {
    console.info(`[ads] rewarded (${placement}) skipped — 非 native 環境`);
    return false;
  }
  try {
    await initAds();
    const AdMob = await admob();
    await AdMob.prepareRewardVideoAd({ adId: unit('rewarded') });
    const result = await AdMob.showRewardVideoAd();
    return !!result;
  } catch (err) {
    console.warn(`[ads] rewarded (${placement}) failed`, err);
    return false;
  }
}

/* --------------------------------------------------------------------------
   開屏廣告 (App Open) —— 冷啟動 / 從背景返回
   -------------------------------------------------------------------------- */
export async function showAppOpenAd() {
  if (!isNative()) return;
  try {
    await initAds();
    const AdMob = await admob();
    await AdMob.prepareInterstitial({ adId: unit('appOpen') });
    await AdMob.showInterstitial();
  } catch (err) {
    console.warn('[ads] app open failed', err);
  }
}
