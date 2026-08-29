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

export function setMuted(v) { muted = !!v; }
export function setHapticsEnabled(v) { hapticsEnabled = !!v; }

/* ==========================================================================
   播放：Web Audio 為主，<audio> 元素做保底
   --------------------------------------------------------------------------
   ⚠️ 點解唔可以淨係用 new Audio() + cloneNode()（原本嘅做法）：
   喺 iOS Safari / WKWebView，一個 media element 要「曾經喺用戶手勢入面
   播過」先解鎖得到。cloneNode() 出嚟嘅係全新元素，永遠冇解鎖過，play()
   會直接 reject NotAllowedError —— 而我哋 .catch 咗佢，所以係靜英英咁
   完全冇聲，console 都冇嘢睇。Chrome 冇呢個限制，所以喺電腦上面試極都
   正常，一裝落 iPhone 就冇曬音效。

   Web Audio 冇呢個問題：只要個 AudioContext 喺手勢入面 resume 過一次，
   之後幾多個 BufferSource 都播得到，而且天生支援重疊播放同變速
   （連擊變調就係靠 playbackRate）。
   ========================================================================== */

let ctx = null;
const buffers = new Map();   // name → AudioBuffer
const elements = new Map();  // name → HTMLAudioElement（保底用）

function ensureCtx() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * 解鎖音訊。一定要喺用戶手勢嘅同步流程入面行。
 * 播一個 1 sample 嘅無聲 buffer —— 部分 iOS 版本淨係 resume() 唔算解鎖，
 * 要真係經 destination 出過聲先算。
 */
export function unlockAudio() {
  const c = ensureCtx();
  if (!c) return;
  try {
    if (c.state !== 'running') c.resume().catch(() => {});
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch {
    /* 解鎖失敗就靠下面 <audio> 保底 */
  }
}

/* 唔用 { once: true }：App 由背景返嚟、或者接／拔耳機之後，iOS 會再次
   suspend 個 context。每次撳都試一次，unlockAudio 本身有 state 檢查，
   已經 running 就幾乎零成本。 */
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  window.addEventListener('touchend', unlockAudio, { capture: true, passive: true });
}

/** 先載一次放進快取，避免第一次觸發時有延遲。檔案很小（1.6KB–110KB）。 */
export function preloadSfx() {
  if (typeof window === 'undefined') return;
  const c = ensureCtx();
  for (const [name, file] of Object.entries(SFX)) {
    if (!file) continue;

    // 保底路線：一個元素一個音效，唔 clone（clone 出嚟嘅喺 iOS 解鎖唔到）
    if (!elements.has(name)) {
      try {
        const audio = new Audio(`/sfx/${file}`);
        audio.preload = 'auto';
        elements.set(name, audio);
      } catch {
        /* 載入失敗永遠不該影響遊戲 */
      }
    }

    if (!c || buffers.has(name)) continue;
    fetch(`/sfx/${file}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => c.decodeAudioData(buf))
      .then((decoded) => buffers.set(name, decoded))
      .catch(() => {
        /* 解碼唔到就一路用保底路線 */
      });
  }
}

function playSfx(name, { rate = 1 } = {}) {
  const file = SFX[name];
  if (muted || !file) return;

  const c = ctx;
  const buffer = buffers.get(name);
  if (c && buffer) {
    try {
      if (c.state !== 'running') c.resume().catch(() => {});
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(c.destination);
      src.start(0);
      return;
    } catch {
      /* 跌落保底路線 */
    }
  }

  // 保底：仲未解碼完、或者部瀏覽器冇 Web Audio。
  // 唔 clone —— 連續觸發會截斷上一次，但總好過冇聲。
  try {
    const audio = elements.get(name);
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.play().catch(() => {});
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
