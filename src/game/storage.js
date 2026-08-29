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
  // dailyMission / bonusHints 同理，都是後加的，舊存檔會自動補上預設值。
  return {
    unlocked: 1,
    completed: {},
    bestMoves: {},
    earnedAt: {},
    /* 每日任務。date 係本機日期（YYYY-MM-DD）—— 純本地邏輯，冇後端、
       冇帳號，同 storage.js 其餘部分一致。 */
    dailyMission: { date: '', taskType: '', claimed: false },
    /* 做完每日任務攞到嘅額外提示，未用嘅會累積。開新一關嗰陣一次過加落
       嗰關嘅 hintsLeft 然後清零（用完即銷，冇「揀邊關用」嘅 UI）。 */
    bonusHints: 0,
  };
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

/** 本機日期 YYYY-MM-DD。刻意唔用 UTC —— 玩家嘅「今日」係佢自己個時區。 */
export function localDateKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 攞走全部累積嘅 bonus hint（一次過清零）。開一關嗰陣叫。 */
export function consumeBonusHints() {
  const progress = loadProgress();
  const n = progress.bonusHints || 0;
  if (n > 0) {
    progress.bonusHints = 0;
    saveProgress(progress);
  }
  return n;
}

/** 記低今日抽到嘅任務。 */
export function saveDailyMission(mission) {
  const progress = loadProgress();
  progress.dailyMission = mission;
  saveProgress(progress);
  return progress;
}

/** 今日任務達成：記低已攞，並且加一個 bonus hint。 */
export function claimDailyMission() {
  const progress = loadProgress();
  if (progress.dailyMission.claimed) return progress; // 一日一次
  progress.dailyMission = { ...progress.dailyMission, claimed: true };
  progress.bonusHints = (progress.bonusHints || 0) + 1;
  saveProgress(progress);
  return progress;
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
