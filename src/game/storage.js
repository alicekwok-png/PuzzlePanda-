const KEY = 'jigsawcard-solitaire-progress-v1';

/* 語言另存一個 key，刻意不放進 progress —— 將來動 progress schema 時
   不會連帶影響語言設定，反之亦然。 */
const LANG_KEY = 'jigsawcard-solitaire-lang-v1';

export function loadLanguage() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

export function saveLanguage(code) {
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    /* 私密模式等狀況下不能寫，忽略 */
  }
}

function defaultProgress() {
  // earnedAt 是後加的欄位（收藏卡要顯示取得日期）。loadProgress 會把舊存檔
  // 跟這個預設值合併，所以舊玩家不會壞，只是早期關卡沒有日期。
  return { unlocked: 1, completed: {}, bestMoves: {}, earnedAt: {} };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return { ...defaultProgress(), ...parsed };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode etc.) - fail silently, non-critical
  }
}

export function markLevelComplete(levelId, moves, totalLevels) {
  const progress = loadProgress();
  progress.completed[levelId] = true;
  // 只記第一次取得的時間，重玩不覆蓋
  if (progress.earnedAt[levelId] == null) {
    progress.earnedAt[levelId] = Date.now();
  }
  const prevBest = progress.bestMoves[levelId];
  if (prevBest == null || moves < prevBest) {
    progress.bestMoves[levelId] = moves;
  }
  if (levelId + 1 <= totalLevels && progress.unlocked < levelId + 1) {
    progress.unlocked = levelId + 1;
  }
  saveProgress(progress);
  return progress;
}

/* --------------------------------------------------------------------------
   只給開發者模式用（見 src/services/devMode.js）
   --------------------------------------------------------------------------
   注意：「解鎖全部關卡」刻意不寫進存檔，只在 App.jsx 用一個顯示層覆蓋
   （visibleProgress）達成。這樣關掉開發者模式之後，真實進度原封不動。
   -------------------------------------------------------------------------- */

/** 清空所有進度，回到全新玩家狀態。 */
export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
  return defaultProgress();
}
