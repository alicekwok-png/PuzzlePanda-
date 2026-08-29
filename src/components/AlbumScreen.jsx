import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS, LEVELS } from '../game/levels';
import { useI18n } from '../i18n/context';
import { feedback } from '../services/feedback';

/* ==========================================================================
   貼紙簿（Sticker Album）
   --------------------------------------------------------------------------
   一本可以隨時翻返嘅實體感 scrapbook：一章一頁，牛皮紙底，貼紙散落貼住，
   撳落去可以放大睇。見 design/sticker-album-spec.md。

   ── 純顯示，唔碰存檔 ────────────────────────────────────────────────
   「收集咗未」100% 由 progress.completed 推導，同 WinModal 用緊同一套
   邏輯：一章 5 個貼紙位對應嗰章 5 關，第 N 關完成 → 第 N 個位顯示真身。
   呢個畫面唔會寫任何嘢入 storage，所以唔可能整壞進度。

   ── 點解唔用遊戲相做底 ──────────────────────────────────────────────
   全部 10 頁共用同一張牛皮紙 texture，唔隨章節變。貼紙簿要似一本獨立
   嘅簿，唔應該同遊戲畫面借位（產品負責人否決過用模糊遊戲相做底嗰版）。

   ── 版面 ────────────────────────────────────────────────────────────
   5 個位用 2 欄格線排（最後一個打橫佔兩欄），但每個位都有各自嘅旋轉同
   偏移，所以讀落係「散落貼住」而唔係一個硬版格仔。呢個做法喺任何闊度
   都唔會溢出，唔使做絕對定位嘅碰撞計算。旋轉／偏移／和紙膠帶顏色全部
   寫死喺 CSS 嘅 :nth-child，唔用隨機數 —— 每次打開都要一模一樣，簿嘅
   擺位跳嚟跳去就唔似一本簿。
   ========================================================================== */

/** 少過呢個位移當手震，唔當揭頁。 */
const SWIPE_MIN_PX = 48;
/** 垂直位移大過水平嘅 80% 就當佢想捲動，唔揭頁。 */
const SWIPE_OFF_AXIS_RATIO = 0.8;

const STICKERS_PER_CHAPTER = 5;

function chapterLevels(chapterId) {
  return LEVELS.filter((l) => l.chapterId === chapterId);
}

/**
 * 打開簿嗰陣停喺邊一頁：第一個未儲齊嘅章。
 * 全部儲齊就停喺最後一頁 —— 嗰陣通常係想欣賞成本簿。
 */
function initialPage(progress) {
  const idx = CHAPTERS.findIndex((c) =>
    chapterLevels(c.id).some((l) => !progress.completed[l.id]),
  );
  return idx === -1 ? CHAPTERS.length - 1 : idx;
}

function formatEarnedAt(ts, lang) {
  if (!ts) return null;
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(ts));
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------
   放大睇
   ------------------------------------------------------------------------- */
function StickerViewer({ sticker, onClose }) {
  const { t, lang } = useI18n();
  const earned = formatEarnedAt(sticker.earnedAt, lang);

  // Esc 關閉 —— 網頁版同外接鍵盤都用得著
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="album-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={sticker.label}
      onClick={onClose}
    >
      <button type="button" className="album-viewer-close" aria-label={t('album.close')}>
        ✕
      </button>
      <img className="album-viewer-img" src={sticker.src} alt={sticker.label} />
      <p className="album-viewer-caption">{sticker.label}</p>
      {earned && <p className="album-viewer-date">{t('album.earnedOn', { date: earned })}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------
   一頁 = 一章
   ------------------------------------------------------------------------- */
function AlbumPage({ chapter, progress, onOpenSticker }) {
  const t = useI18n().t;
  const levels = chapterLevels(chapter.id);

  return (
    <div className="album-page">
      {/* 逐格填：同一頁可以混住真身同未收集位，唔使成章儲齊先顯示 */}
      {Array.from({ length: STICKERS_PER_CHAPTER }, (_, i) => {
        const level = levels[i];
        const collected = !!progress.completed[level.id];
        const label = t('album.stickerLabel', {
          chapterName: t(`chapters.${chapter.key}`),
          n: i + 1,
        });

        if (!collected) {
          return (
            <div key={level.id} className="album-slot is-locked" aria-label={t('album.locked')}>
              <span className="album-slot-question" aria-hidden="true">
                ?
              </span>
            </div>
          );
        }

        const src = `/stickers/${chapter.key}/sticker-0${i + 1}.webp`;
        return (
          <button
            key={level.id}
            type="button"
            className="album-slot"
            aria-label={label}
            onClick={() => {
              feedback.tap();
              onOpenSticker({ src, label, earnedAt: progress.earnedAt?.[level.id] });
            }}
          >
            <img className="album-sticker" src={src} alt="" loading="lazy" />
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------
   ------------------------------------------------------------------------- */
export default function AlbumScreen({ progress, onBack }) {
  const t = useI18n().t;
  const [page, setPage] = useState(() => initialPage(progress));
  const [viewing, setViewing] = useState(null);
  const swipeRef = useRef(null);

  const chapter = CHAPTERS[page];
  const collectedTotal = LEVELS.filter((l) => progress.completed[l.id]).length;

  const goTo = useCallback((next) => {
    if (next < 0 || next >= CHAPTERS.length) return;
    feedback.tap();
    setPage(next);
  }, []);

  function handlePointerDown(e) {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_OFF_AXIS_RATIO) return;
    goTo(page + (dx < 0 ? 1 : -1));
  }

  return (
    <div className="screen album-screen">
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label={t('nav.backHome')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">
          <span className="level-kicker">{t('album.title')}</span>
          {t(`chapters.${chapter.key}`)}
        </div>
        <span className="album-count">
          {t('album.count', { done: collectedTotal, total: LEVELS.length })}
        </span>
      </div>

      <div
        className="album-sheet"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        <AlbumPage chapter={chapter} progress={progress} onOpenSticker={setViewing} />
      </div>

      {/* 書本式頁碼，唔用 dots —— 10 頁用點仔會又細又數唔到 */}
      <div className="album-pager">
        <button
          type="button"
          className="album-pager-btn"
          onClick={() => goTo(page - 1)}
          disabled={page === 0}
          aria-label={t('album.prevPage')}
        >
          ‹
        </button>
        <span className="album-pager-label">
          {page + 1} / {CHAPTERS.length}
        </span>
        <button
          type="button"
          className="album-pager-btn"
          onClick={() => goTo(page + 1)}
          disabled={page === CHAPTERS.length - 1}
          aria-label={t('album.nextPage')}
        >
          ›
        </button>
      </div>

      {viewing && <StickerViewer sticker={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
