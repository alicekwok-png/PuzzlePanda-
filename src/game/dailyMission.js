/* ==========================================================================
   每日任務
   --------------------------------------------------------------------------
   見 design/daily-mission-spec.md。

   ── 點解係呢三個任務 ────────────────────────────────────────────────
   全部都建喺**已經追蹤緊嘅數據**上面（用咗幾多提示、bestMoves 紀錄），
   所以唔使為咗做呢個功能而加新嘅計時器／統計。加新 instrumentation 係
   最易出事嘅做法 —— 兩處計數唔同步，玩家就會覺得任務判錯。

   ── 純本機 ──────────────────────────────────────────────────────────
   日期用裝置本地日期（唔用 UTC —— 玩家嘅「今日」係佢自己個時區）。
   冇後端、冇帳號，同 storage.js 其餘部分一致。改機錶就可以刷 —— 呢個
   係已知取捨，獎勵只係一個提示，唔值得為咗防作弊而起一套伺服器。
   ========================================================================== */
import { localDateKey, saveDailyMission } from './storage';

/** 完成呢一關之後先解鎖每日任務。 */
export const UNLOCK_AFTER_LEVEL = 10;

export const TASKS = {
  NO_HINT: 'no-hint',
  BEAT_BEST: 'beat-best',
  ANY_LEVEL: 'any-level',
};

export function isUnlocked(progress) {
  return !!progress.completed[UNLOCK_AFTER_LEVEL];
}

/**
 * 抽今日嘅任務。
 * ⚠️ 玩家一個 bestMoves 紀錄都未有嘅話，唔會抽到「刷新紀錄」——
 * 否則就會出現「今日任務點都做唔到」。
 */
function pickTask(progress, random = Math.random) {
  const hasAnyBest = Object.keys(progress.bestMoves || {}).length > 0;
  const pool = hasAnyBest
    ? [TASKS.NO_HINT, TASKS.BEAT_BEST, TASKS.ANY_LEVEL]
    : [TASKS.NO_HINT, TASKS.ANY_LEVEL];
  return pool[Math.floor(random() * pool.length)];
}

/**
 * 攞今日嘅任務；日期唔同就當新一日，重新抽過同埋 reset claimed。
 * 有寫入就順便存返落 storage，所以呼叫者永遠攞到「今日」嗰個。
 */
export function ensureTodayMission(progress, random = Math.random) {
  const today = localDateKey();
  const current = progress.dailyMission ?? {};
  if (current.date === today && current.taskType) return current;

  const mission = { date: today, taskType: pickTask(progress, random), claimed: false };
  saveDailyMission(mission);
  return mission;
}

/**
 * 啱啱過完一關，睇下今日任務達唔達成。
 *
 * @param mission     今日任務
 * @param result.hintsUsed    呢一鋪用咗幾多次提示
 * @param result.moves        呢一鋪用咗幾多步
 * @param result.previousBest 呢一關之前嘅最佳步數（未有紀錄就 null）
 */
export function isMissionSatisfied(mission, { hintsUsed, moves, previousBest }) {
  if (!mission || mission.claimed) return false;
  switch (mission.taskType) {
    case TASKS.NO_HINT:
      return hintsUsed === 0;
    case TASKS.BEAT_BEST:
      // 未有紀錄就唔算「刷新」—— 第一次完成唔應該白撿一個獎
      return previousBest != null && moves < previousBest;
    case TASKS.ANY_LEVEL:
      return true;
    default:
      return false;
  }
}
