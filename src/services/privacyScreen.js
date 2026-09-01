import { Capacitor } from '@capacitor/core';

/* ==========================================================================
   Peek 防截圖
   --------------------------------------------------------------------------
   平台限制係死嘅，做唔到「全平台都真係擋得住」：
   - Android：@capacitor-community/privacy-screen 嘅 enable() 會開
     FLAG_SECURE，peek 期間畫面對截圖／錄影都係黑嘅，真係擋得住。
   - iOS：Apple 唔畀第三方 App 阻止截圖，呢個係平台硬性限制，冇得
     繞過。enable() 淨係遮住 App 切換器嘅預覽，擋唔到張相本身。
     淨係可以聽 screenshotTaken 事件，喺用戶截完之後即刻收返個 peek
     再多扣一次機會，做懲罰、唔係防範。
   - Web（未打包做原生 App 之前，即係而家嘅 puzzlepanda.onrender.com）：
     瀏覽器完全冇對應 API，成個 module 喺呢度直接冇反應——
     isNativePlatform() 為 false 就即刻短路。

   未打包（冇 android/ 或 ios/ 資料夾）嘅時候，動態 import 嘅原生模組
   都仲未落地，全部包埋 try/catch 靜靜跳過，唔會累到成個遊戲炸咗。
   ========================================================================== */

let pluginPromise = null;
let listenerHandle = null;

function loadPlugin() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(null);
  if (!pluginPromise) {
    pluginPromise = import('@capacitor-community/privacy-screen')
      .then((mod) => mod.PrivacyScreen)
      .catch(() => null);
  }
  return pluginPromise;
}

/**
 * 開始 peek 嗰一刻叫呢個。
 * Android 即刻開 FLAG_SECURE；iOS 開始聽 screenshotTaken，
 * 截到就叫 onScreenshotDetected（GameScreen 負責收 peek + 扣機會）。
 */
export async function protectPeek(onScreenshotDetected) {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.enable();
  } catch {
    /* 冇裝原生模組、或者平台唔支援就靜靜跳過 —— 呢個功能失敗都唔應該
       累到 peek 本身唔用得。 */
  }

  if (Capacitor.getPlatform() === 'ios' && typeof onScreenshotDetected === 'function') {
    try {
      listenerHandle = await plugin.addListener('screenshotTaken', onScreenshotDetected);
    } catch {
      /* ignore */
    }
  }
}

/** 收 peek 嗰一刻叫呢個：關返 enable()，拆聽筒。 */
export async function unprotectPeek() {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.disable();
  } catch {
    /* ignore */
  }

  if (listenerHandle) {
    try {
      await listenerHandle.remove();
    } catch {
      /* ignore */
    }
    listenerHandle = null;
  }
}
