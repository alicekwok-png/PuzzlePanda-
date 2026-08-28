import { useState } from 'react';
import { CHAPTERS, LEVELS } from '../game/levels';
import { useT } from '../i18n/context';
import { AD_POLICY } from '../services/ads';
import { feedback } from '../services/feedback';
import AdSlot from './AdSlot';

function chapterLevels(chapterId) {
  return LEVELS.filter((l) => l.chapterId === chapterId);
}

/** 玩家目前進度那一關的照片，用來當環境光 —— 每翻一章顏色就跟著換。 */
function ambientFor(progress) {
  return (LEVELS.find((l) => l.id === progress.unlocked) ?? LEVELS[0]).theme.background;
}

/* -------------------------------------------------------------------------
   第一層：選主題章節（10 章）
   ------------------------------------------------------------------------- */
function ChapterGrid({ progress, onSelectChapter, onBack }) {
  const t = useT();
  const completedTotal = LEVELS.filter((l) => progress.completed[l.id]).length;

  return (
    <div className="screen level-select-screen" style={{ '--level-bg': ambientFor(progress) }}>
      <div className="ambient" />

      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label={t('nav.backHome')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">
          <span className="level-kicker">{t('levelSelect.collectionProgress')}</span>
          {t('levelSelect.collectionCount', { done: completedTotal, total: LEVELS.length })}
        </div>
        <div className="top-bar-spacer" />
      </div>

      <div className="chapter-grid">
        {CHAPTERS.map((chapter) => {
          const levels = chapterLevels(chapter.id);
          const locked = levels[0].id > progress.unlocked;
          const done = levels.filter((l) => progress.completed[l.id]).length;

          return (
            <button
              key={chapter.id}
              type="button"
              className={`chapter-tile${locked ? ' is-locked' : ''}${done === 5 ? ' is-complete' : ''}`}
              style={locked ? undefined : { backgroundImage: levels[0].theme.background }}
              disabled={locked}
              onClick={() => {
                feedback.tap();
                onSelectChapter(chapter.id);
              }}
            >
              {locked ? (
                <span className="chapter-tile-lock">🔒</span>
              ) : (
                <span className="chapter-tile-overlay">
                  {/* 只顯示當前語言的章節名，不再中英並列 */}
                  <span className="chapter-tile-name">{t(`chapters.${chapter.key}`)}</span>
                  <span className="chapter-tile-progress">
                    <span className="chapter-tile-bar">
                      <span style={{ width: `${(done / 5) * 100}%` }} />
                    </span>
                    {done}/5
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 廣告版位：章節選擇頁底部橫幅 */}
      <AdSlot id="chapterselect-bottom-banner" format="banner" label={t('ads.bannerSlot')} />
    </div>
  );
}

/* -------------------------------------------------------------------------
   第二層：選該章節的 5 關
   ------------------------------------------------------------------------- */
function LevelGrid({ chapter, progress, onSelectLevel, onBack }) {
  const t = useT();
  const levels = chapterLevels(chapter.id);

  return (
    <div className="screen level-select-screen" style={{ '--level-bg': levels[0].theme.background }}>
      <div className="ambient" />

      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label={t('nav.backToThemes')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">
          <span className="level-kicker">{t('levelSelect.chapterKicker', { n: chapter.id })}</span>
          {t(`chapters.${chapter.key}`)}
        </div>
        <div className="top-bar-spacer" />
      </div>

      <div className="level-grid">
        {levels.map((lvl) => {
          const locked = lvl.id > progress.unlocked;
          const completed = !!progress.completed[lvl.id];
          return (
            <button
              key={lvl.id}
              type="button"
              className={`level-tile${locked ? ' is-locked' : ''}${completed ? ' is-completed' : ''}`}
              style={locked ? undefined : { backgroundImage: lvl.theme.background }}
              disabled={locked}
              onClick={() => {
                feedback.tap();
                onSelectLevel(lvl);
              }}
            >
              {!locked && (
                <span className="level-tile-size">
                  {lvl.size}×{lvl.size}
                </span>
              )}
              <span className="level-tile-number">{locked ? '🔒' : lvl.levelInChapter}</span>
              {completed && <span className="level-tile-check">✓</span>}
            </button>
          );
        })}

        {/* 廣告版位：一章 5 關 + 這張原生卡，剛好補滿 3 欄格線的第 6 格 */}
        {AD_POLICY.nativeInLevelGrid && (
          <AdSlot id="levelselect-native-card" format="native" label={t('ads.nativeSlot')} />
        )}
      </div>

      {/* 廣告版位：關卡選擇頁底部橫幅 */}
      <AdSlot id="levelselect-bottom-banner" format="banner" label={t('ads.bannerSlot')} />
    </div>
  );
}

export default function LevelSelect({ progress, onSelectLevel, onBack }) {
  const [activeChapterId, setActiveChapterId] = useState(null);

  if (activeChapterId == null) {
    return <ChapterGrid progress={progress} onSelectChapter={setActiveChapterId} onBack={onBack} />;
  }

  return (
    <LevelGrid
      chapter={CHAPTERS.find((c) => c.id === activeChapterId)}
      progress={progress}
      onSelectLevel={onSelectLevel}
      onBack={() => setActiveChapterId(null)}
    />
  );
}
