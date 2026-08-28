/* ==========================================================================
   回饋層 —— 音效與震動的觸發點 (Hooks)
   --------------------------------------------------------------------------
   遊戲邏輯「只呼叫這裡、不直接播放」。這樣做的好處：
   - 要換音效庫、加音量設定、關閉震動，都只改這一支檔案。
   - 跑自動化測試時整層可以靜音，邏輯不受影響。

   音效素材：design/sfx-spec.md（Kenney.nl CC0，win 是 Epidemic Sound 訂閱
   授權 —— 上架前要覆核訂閱條款是否仍涵蓋）。
   ⚠️ 全部用 .mp3 不用 .ogg：iOS 的 WKWebView（Capacitor 在 iOS 用的引擎）
   從來不支援 Ogg/Vorbis，只有 Android/Chrome 播得到。
   ========================================================================== */
import { Capacitor } from '@capacitor/core';

/** 事件 → public/sfx/ 下的檔名。空字串代表這個事件目前沒有音效。 */
const SFX = {
  swap: 'swap.mp3',         // 交換成功但沒有任何格子歸位
  lock: 'lock.mp3',         // 有格子歸位
  hint: 'hint.mp3',
  undo: 'undo.mp3',
  tap: 'tap.mp3',           // 一般 UI 按鍵
  peekOpen: 'peek-open.mp3',
  peekClose: 'peek-close.mp3',
  win: 'win.mp3',
  pickUp: '',               // 素材未提供，只做震動
};

let muted = false;
let hapticsEnabled = true;
const cache = new Map();

export function setMuted(v) { muted = !!v; }
export function setHapticsEnabled(v) { hapticsEnabled = !!v; }

/** 先載一次放進快取，避免第一次觸發時有延遲。檔案很小（1.6KB–110KB）。 */
export function preloadSfx() {
  if (typeof Audio === 'undefined') return;
  for (const [name, file] of Object.entries(SFX)) {
    if (!file || cache.has(name)) continue;
    try {
      const audio = new Audio(`/sfx/${file}`);
      audio.preload = 'auto';
      cache.set(name, audio);
    } catch {
      /* 載入失敗永遠不該影響遊戲 */
    }
  }
}

function playSfx(name, { rate = 1 } = {}) {
  const file = SFX[name];
  if (muted || !file) return;
  try {
    let audio = cache.get(name);
    if (!audio) {
      audio = new Audio(`/sfx/${file}`);
      cache.set(name, audio);
    }
    // clone 才能讓同一個音效重疊播放（連續快速交換時不會被截斷）
    const node = audio.cloneNode();
    node.playbackRate = rate;
    node.play().catch(() => {});
  } catch {
    /* 音效失敗永遠不該影響遊戲 */
  }
}

async function haptic(style) {
  if (!hapticsEnabled || !Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Light });
    }
  } catch {
    /* 沒裝 @capacitor/haptics 或平台不支援，安靜跳過 */
  }
}

/* --------------------------------------------------------------------------
   遊戲邏輯呼叫的觸發點
   -------------------------------------------------------------------------- */
export const feedback = {
  /** 拿起一塊。素材沒有對應音效，只給輕震動。 */
  pickUp() {
    haptic('light');
  },

  /** 交換成功，但沒有任何格子歸位。 */
  swap() {
    playSfx('swap');
    haptic('light');
  },

  /**
   * 有格子歸位。連擊數越高音調越高 —— 最便宜也最有效的爽感做法。
   * 注意 swap 與 lock 一定要分得開：不是每次交換都播 lock。
   */
  lock(comboCount = 1) {
    const rate = Math.min(1 + (comboCount - 1) * 0.08, 1.6);
    playSfx('lock', { rate });
    haptic('light');
  },

  hint() {
    playSfx('hint');
    haptic('light');
  },

  undo() {
    playSfx('undo');
    haptic('light');
  },

  peekOpen() {
    playSfx('peekOpen');
    haptic('light');
  },

  peekClose() {
    playSfx('peekClose');
  },

  levelClear() {
    playSfx('win');
    haptic('success');
  },

  tap() {
    playSfx('tap');
  },
};
