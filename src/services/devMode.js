/* ==========================================================================
   開發者模式
   --------------------------------------------------------------------------
   用途：內部試玩／給設計部看圖時，可以直接跳去任何一關，不用真的打通關。

   啟用條件（兩者其一）：
   1. `npm run dev` 開發伺服器 —— import.meta.env.DEV 為 true
   2. 網址加 ?dev=1 —— 讓打包後的版本也能在真機上開（要手動打網址）

   ⚠️ 正式打包（npm run build）時 import.meta.env.DEV 是 false，Vite 會把
   下面的判斷連同整個開發者列一起 tree-shake 掉，玩家版本不會有這個功能。
   除非有人自己在網址加 ?dev=1，所以這不是安全機制，只是方便的內部工具。
   ========================================================================== */

const UNLOCK_KEY = 'jigsawcard-devmode-unlock-all';

/** 這個 build 是否允許開發者模式。 */
export function isDevBuild() {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).has('dev');
  } catch {
    return false;
  }
}

/** 目前是否開著「全關卡解鎖」。 */
export function isUnlockAll() {
  if (!isDevBuild()) return false;
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function setUnlockAll(on) {
  try {
    if (on) localStorage.setItem(UNLOCK_KEY, '1');
    else localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* 私密模式等狀況下不能寫，忽略 */
  }
}
