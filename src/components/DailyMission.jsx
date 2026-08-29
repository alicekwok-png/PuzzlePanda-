import { useEffect } from 'react';
import { ensureTodayMission, isUnlocked, TASKS, UNLOCK_AFTER_LEVEL } from '../game/dailyMission';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';
import Icon from './Icon';

/* ==========================================================================
   每日任務
   --------------------------------------------------------------------------
   見 design/daily-mission-spec.md。版面跟設計交嘅 mockup：吉祥物徽章騎喺
   卡頂、標題、任務項（icon + 文字 + 進度）、虛線獎勵框、底部 CTA。

   ⚠️ 四個位全部用插畫 PNG，唔用 emoji（📅✅💡🐼）—— 全個 project 嘅
   原則，emoji 會跟住系統字型變樣，三個平台畫出嚟完全唔同。

   ⚠️ 呢個 component 唔會判斷任務達成 —— 判斷喺 GameScreen 過關嗰刻做，
   因為只有嗰度先同時知道「用咗幾多提示 / 幾多步 / 之前嘅最佳步數」。
   呢度純粹顯示。
   ========================================================================== */

const TASK_KEY = {
  [TASKS.NO_HINT]: 'daily.taskNoHint',
  [TASKS.BEAT_BEST]: 'daily.taskBeatBest',
  [TASKS.ANY_LEVEL]: 'daily.taskAnyLevel',
};

/** 首頁嗰粒入口掣。 */
export function DailyMissionButton({ progress, onOpen }) {
  const t = useT();
  const unlocked = isUnlocked(progress);
  const mission = unlocked ? ensureTodayMission(progress) : null;
  const hasReward = unlocked && mission && !mission.claimed;

  /* ⚠️ 唔用 .icon-btn。塞落 40px 嘅掣入面，扣埋內距同邊框，實際張插畫
     淨係得廿一 px，個熊貓同月曆完全睇唔出係咩 —— 呢張圖白畫。
     跟參考 app 嘅做法：做一個獨立嘅插畫物件 + 文字標籤，唔要掣嘅外殼。 */
  return (
    <button
      type="button"
      className={`home-corner is-right${unlocked ? '' : ' is-locked'}`}
      onClick={() => {
        feedback.tap();
        onOpen();
      }}
      aria-label={t(unlocked ? 'daily.openAria' : 'daily.lockedAria', { n: UNLOCK_AFTER_LEVEL })}
    >
      <span className="home-corner-art">
        <img src="/icons/daily-calendar.webp" alt="" />
        {/* 未解鎖掛個鎖；解鎖咗而今日未攞獎就出粒紅點 */}
        {!unlocked && (
          <span className="home-daily-lock" aria-hidden="true">
            <Icon name="lock" />
          </span>
        )}
        {hasReward && <span className="home-daily-dot" aria-hidden="true" />}
      </span>
      <span className="home-corner-label">{t('daily.shortLabel')}</span>
    </button>
  );
}

/** 撳咗入嚟見到嘅彈窗。 */
export default function DailyMission({ progress, onClose }) {
  const t = useT();
  const unlocked = isUnlocked(progress);
  const mission = unlocked ? ensureTodayMission(progress) : null;
  const done = !!mission?.claimed;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay daily-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.title')}
      onClick={onClose}
    >
      <div className="daily-card" onClick={(e) => e.stopPropagation()}>
        {/* 吉祥物徽章騎喺卡頂邊上 */}
        <img className="daily-badge" src="/icons/daily-badge.webp" alt="" />

        <button type="button" className="daily-close" onClick={onClose} aria-label={t('daily.close')}>
          <Icon name="close" />
        </button>

        <h2 className="daily-heading">
          <img className="daily-heading-icon" src="/icons/daily-calendar.webp" alt="" />
          {t('daily.title')}
        </h2>

        {!unlocked ? (
          <div className="daily-row">
            <span className="daily-row-icon is-locked">
              <Icon name="lock" />
            </span>
            <span className="daily-row-text">
              <b>{t('daily.lockedTitle')}</b>
              <small>{t('daily.lockedBody', { n: UNLOCK_AFTER_LEVEL })}</small>
            </span>
          </div>
        ) : (
          <>
            <div className={`daily-row${done ? ' is-done' : ''}`}>
              <span className="daily-row-icon">
                <img src="/icons/daily-check.webp" alt="" />
              </span>
              <span className="daily-row-text">
                <b>{t(TASK_KEY[mission.taskType] ?? 'daily.taskAnyLevel')}</b>
                <small>{t(done ? 'daily.taskDone' : 'daily.taskTodo')}</small>
              </span>
              <span className="daily-row-count">{done ? 1 : 0}/1</span>
            </div>

            <div className="daily-row is-reward">
              <span className="daily-row-icon">
                <img src="/icons/daily-reward.webp" alt="" />
              </span>
              <span className="daily-row-text">
                <b>{t('daily.reward')}</b>
                <small>{t('daily.rewardHint')}</small>
              </span>
            </div>
          </>
        )}

        <button className="primary-btn daily-cta" onClick={onClose}>
          {t('daily.close')}
        </button>
      </div>
    </div>
  );
}
