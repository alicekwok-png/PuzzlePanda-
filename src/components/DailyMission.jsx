import { useEffect } from 'react';
import { ensureTodayMission, isUnlocked, TASKS, UNLOCK_AFTER_LEVEL } from '../game/dailyMission';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';
import Icon from './Icon';

/* ==========================================================================
   每日任務
   --------------------------------------------------------------------------
   見 design/daily-mission-spec.md。

   入口係首頁頂部一粒月曆掣：未解鎖（未完成第 10 關）就灰暗 + 掛個鎖，
   撳落去淨係話你知點解鎖；已解鎖就見到今日任務同完成狀態，未攞獎就
   有粒紅點。

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

  return (
    <button
      type="button"
      className={`icon-btn home-daily${unlocked ? '' : ' is-locked'}`}
      onClick={() => {
        feedback.tap();
        onOpen();
      }}
      aria-label={t(unlocked ? 'daily.openAria' : 'daily.lockedAria', { n: UNLOCK_AFTER_LEVEL })}
    >
      <Icon name="calendar" className="icon-btn-svg" />
      {/* 未解鎖掛個鎖；解鎖咗而今日未攞獎就出粒紅點 */}
      {!unlocked && (
        <span className="home-daily-lock" aria-hidden="true">
          <Icon name="lock" />
        </span>
      )}
      {hasReward && <span className="home-daily-dot" aria-hidden="true" />}
    </button>
  );
}

/** 撳咗入嚟見到嘅內容。 */
export default function DailyMission({ progress, onClose }) {
  const t = useT();
  const unlocked = isUnlocked(progress);
  const mission = unlocked ? ensureTodayMission(progress) : null;

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
        <p className="modal-kicker">{t('daily.title')}</p>

        {!unlocked && (
          <>
            <div className="daily-lock-art" aria-hidden="true">
              <Icon name="lock" />
            </div>
            <p className="daily-body">{t('daily.lockedBody', { n: UNLOCK_AFTER_LEVEL })}</p>
          </>
        )}

        {unlocked && (
          <>
            <p className={`daily-task${mission.claimed ? ' is-done' : ''}`}>
              {mission.claimed && (
                <span className="daily-check">
                  <Icon name="check" />
                </span>
              )}
              {t(TASK_KEY[mission.taskType] ?? 'daily.taskAnyLevel')}
            </p>
            <p className="daily-reward">
              <Icon name="bulb" className="daily-reward-icon" />
              {t('daily.reward')}
            </p>
            <p className="daily-body">
              {t(mission.claimed ? 'daily.doneBody' : 'daily.todoBody')}
            </p>
          </>
        )}

        <div className="modal-actions">
          <button className="primary-btn" onClick={onClose}>
            {t('daily.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
