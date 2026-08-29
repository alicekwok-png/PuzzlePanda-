import { useState } from 'react';
import { CHAPTERS, LEVELS } from '../game/levels';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';
import AdSlot from './AdSlot';
import Icon from './Icon';

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
                <span className="chapter-tile-lock">
                  <Icon name="lock" />
                </span>
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
   第二層：該章節的 5 關，排成一條路徑地圖
   -------------------------------------------------------------------------
   跟設計稿 02「選關 Level Select · 章節路徑地圖」。取代咗原本嘅格仔 ——
   格仔嘅未解鎖格淨係一個鎖，一大片空白格好核突，而且睇唔出「一關接一關
   行落去」嘅感覺。

   ── 座標點 ─────────────────────────────────────────────────────────
   路徑同五個節點共用一個 338×440 嘅正規化座標空間，所以條路一定穿過
   節點中心。SVG 用 preserveAspectRatio="none" 跟住容器變形，再用
   vector-effect="non-scaling-stroke" 令線粗唔會跟住扯闊扯窄。
   ------------------------------------------------------------------------- */

/** 設計稿嗰條路徑（338×440 座標空間）。 */
const PATH_D =
  'M58,64 C118,80 158,100 178,134 C218,178 238,198 258,234 ' +
  'C238,278 198,298 168,334 C138,358 88,378 58,404';

/** 五個節點嘅中心，用百分比表示（＝路徑嘅五個錨點 ÷ 338×440）。 */
const NODE_POS = [
  { x: 17.2, y: 14.5 },
  { x: 52.7, y: 30.5 },
  { x: 76.3, y: 53.2 },
  { x: 49.7, y: 75.9 },
  { x: 17.2, y: 91.8 },
];

function LevelPath({ chapter, progress, onSelectChapter, onSelectLevel, onBack }) {
  const t = useT();
  const levels = chapterLevels(chapter.id);
  const done = levels.filter((l) => progress.completed[l.id]).length;
  /* 「而家行到呢度」= 第一關未完成而又解鎖咗嘅。用嚟擺熊貓公仔同關數牌。 */
  const currentId = levels.find((l) => !progress.completed[l.id] && l.id <= progress.unlocked)?.id;

  return (
    <div className="screen level-select-screen" style={{ '--level-bg': levels[0].theme.background }}>
      <div className="ambient" />

      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label={t('nav.backToThemes')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">{t('levelSelect.chooseLevel')}</div>
        <div className="top-bar-spacer" />
      </div>

      {/* 章節分頁：唔使返上一層都轉到章 */}
      <div className="chapter-tabs">
        {CHAPTERS.map((c) => {
          const chLevels = chapterLevels(c.id);
          const locked = chLevels[0].id > progress.unlocked;
          const active = c.id === chapter.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`chapter-tab${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
              disabled={locked}
              onClick={() => {
                feedback.tap();
                onSelectChapter(c.id);
              }}
            >
              {locked && <Icon name="lock" />}
              <span className="chapter-tab-num">{t('levelSelect.chapterKicker', { n: c.id })}</span>
              <span className="chapter-tab-name">{t(`chapters.${c.key}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="path-caption">
        <span className="path-caption-name">
          {t('levelSelect.chapterKicker', { n: chapter.id })} · {t(`chapters.${chapter.key}`)}
        </span>
        <span className="path-caption-done">
          {t('levelSelect.chapterDone', { done, total: levels.length })}
        </span>
      </div>

      <div className="level-map">
        {/* 節點同條路都擺喺呢個內縮框入面。唔內縮嘅話，第 1 關上面隻熊貓
            公仔同第 5 關下面個關數牌會俾面板嘅 overflow:hidden 裁走。 */}
        <div className="level-map-inner">
        <svg className="level-map-path" viewBox="0 0 338 440" preserveAspectRatio="none" aria-hidden="true">
          <path className="level-map-path-base" d={PATH_D} vectorEffect="non-scaling-stroke" />
          <path className="level-map-path-dash" d={PATH_D} vectorEffect="non-scaling-stroke" />
        </svg>

        {levels.map((lvl, i) => {
          const locked = lvl.id > progress.unlocked;
          const completed = !!progress.completed[lvl.id];
          const isCurrent = lvl.id === currentId;
          const pos = NODE_POS[i];
          const cls = [
            'level-node',
            locked ? 'is-locked' : '',
            completed ? 'is-completed' : '',
            isCurrent ? 'is-current' : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={lvl.id} className="level-node-slot" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              {/* 熊貓公仔企喺「而家行到呢關」上面 */}
              {isCurrent && <img className="level-node-avatar" src="/icons/logo.png" alt="" />}

              <button
                type="button"
                className={cls}
                disabled={locked}
                style={locked ? undefined : { backgroundImage: lvl.theme.background }}
                aria-label={t('levelSelect.levelAria', { n: lvl.id, size: lvl.size })}
                onClick={() => {
                  feedback.tap();
                  onSelectLevel(lvl);
                }}
              >
                {locked && <Icon name="lock" />}
              </button>

              {/* 完成咗就喺角落貼返嗰關嘅貼紙 */}
              {completed && (
                <img
                  className="level-node-sticker"
                  src={`/stickers/${chapter.key}/sticker-0${lvl.levelInChapter}.webp`}
                  alt=""
                />
              )}

              <span className="level-node-label">{lvl.id}</span>
            </div>
          );
        })}
        </div>
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
    <LevelPath
      chapter={CHAPTERS.find((c) => c.id === activeChapterId)}
      progress={progress}
      onSelectChapter={setActiveChapterId}
      onSelectLevel={onSelectLevel}
      onBack={() => setActiveChapterId(null)}
    />
  );
}
