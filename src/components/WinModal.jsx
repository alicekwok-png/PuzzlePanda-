import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/context';

/* ==========================================================================
   過關結算
   --------------------------------------------------------------------------
   排版重點：**張相係主角**。玩家花咗幾分鐘砌，過關嗰一刻要見返完整幅相
   夠大。所以其他元素一律壓到最細 —— 冇獨立大標題（大張相本身就係「完成
   咗」嘅訊息）、關卡名縮成一行細字、貼紙唔佔常駐空間（見下面）。
   張相嘅闊度由剩餘高度反推，見 .modal-photo-stack 嘅註解。

   貼紙動畫：彈出 → 停一停 → 縮細飛入下面「已收入貼紙簿」嗰格。
   飛完先至見到嗰格亮起。咁樣貼紙有「拎到手再收埋」嘅感覺，而且因為佢
   飛完就消失，唔使長期霸住一大格位，張相就可以再大啲。
   ========================================================================== */

/** 飛緊嗰陣貼紙嘅邊長（px）。要同 CSS 的 .sticker-flight 一致，
    落地時嘅縮放比例係由呢個數同目標格嘅實際闊度計出嚟。 */
const FLY_SIZE = 190;
/** 等 modalIn（0.32s）行完先量目標位置 —— 佢用緊 transform，
    行緊嗰陣量到嘅 getBoundingClientRect 係動畫中途嗰個錯位置。 */
const MEASURE_DELAY_MS = 380;

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 由畫面正中飛去 targetRef 嗰格。量到位置先開始，量唔到就直接當落咗地。 */
function StickerFlight({ src, label, targetRef, onLanded }) {
  const [dest, setDest] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = targetRef.current;
      if (!el) {
        onLanded();
        return;
      }
      const r = el.getBoundingClientRect();
      setDest({
        x: r.left + r.width / 2 - window.innerWidth / 2,
        y: r.top + r.height / 2 - window.innerHeight / 2,
        s: r.width / FLY_SIZE,
      });
    }, MEASURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [targetRef, onLanded]);

  if (!dest) return null;

  return (
    <div
      className="sticker-flight"
      aria-hidden="true"
      style={{ '--fly-x': `${dest.x}px`, '--fly-y': `${dest.y}px`, '--fly-s': dest.s }}
      /* 光暈同標籤都有自己嘅動畫，animationend 會冒泡上嚟，
         所以要認住係外層自己嗰個先當飛完。 */
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onLanded();
      }}
    >
      <span className="sticker-flight-glow" />
      <span className="sticker-flight-burst" />
      <img className="sticker-flight-img" src={src} alt="" />
      <span className="sticker-flight-label">{label}</span>
    </div>
  );
}

export default function WinModal({ level, moves, bestMoves, hasNext, onNext, onReplay, onExit }) {
  const t = useT();
  const isNewBest = bestMoves != null && moves <= bestMoves;
  const stickerSrc = `/stickers/${level.chapterKey}/sticker-0${level.levelInChapter}.webp`;

  const slotRef = useRef(null);
  // 減少動態嘅話唔好飛，直接當已經收咗
  const [landed, setLanded] = useState(prefersReducedMotion);
  const handleLanded = useCallback(() => setLanded(true), []);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t('win.ariaLabel')}>
      <div className="modal-card">
        {/* 獎勵係「收藏到一張完整嘅相」，唔係一個分數。
            後面兩張歪住嘅卡由 CSS 嘅 ::before / ::after 畫，讀落似
            「又收多咗一張入相簿」。 */}
        <div className="modal-photo-stack">
          <div className="modal-photo">
            <span style={{ backgroundImage: level.theme.background }} />
          </div>
          <span className="modal-sparkles" aria-hidden="true" />
        </div>

        <p className="modal-level-name">
          {isNewBest && <b className="modal-best-tag">{t('win.kickerNewBest')}</b>}
          {t('win.levelLine', { n: level.id, chapterName: t(`chapters.${level.chapterKey}`) })}
        </p>

        <div className="modal-stats">
          <div className="modal-stat">
            <span className="v">{moves}</span>
            <span className="k">{t('win.statMoves')}</span>
          </div>
          <div className="modal-stat">
            <span className="v">
              {level.size}×{level.size}
            </span>
            <span className="k">{t('win.statDifficulty')}</span>
          </div>
          {bestMoves != null && (
            <div className="modal-stat">
              <span className="v">{bestMoves}</span>
              <span className="k">{t('win.statBest')}</span>
            </div>
          )}
        </div>

        {/* 貼紙飛落嚟嘅落腳點。未飛到之前係透明但一樣佔位 ——
            用 opacity 而唔係 display:none，否則量唔到佢喺邊。 */}
        <div ref={slotRef} className={`sticker-filed${landed ? ' is-in' : ''}`}>
          <img className="sticker-filed-img" src={stickerSrc} alt="" />
          <span>{t('win.stickerFiled')}</span>
        </div>

        <div className="modal-actions">
          {hasNext && (
            <button className="primary-btn is-next" onClick={onNext}>
              {t('win.nextLevel')}
            </button>
          )}
          {/* 兩個次要動作並排，唔好同綠色主鍵爭注意力 */}
          <div className="secondary-row">
            <button className="secondary-btn" onClick={onReplay}>
              {t('win.playAgain')}
            </button>
            <button className="secondary-btn" onClick={onExit}>
              {t('win.backToLevels')}
            </button>
          </div>
        </div>
      </div>

      {!landed && (
        <StickerFlight
          src={stickerSrc}
          label={t('win.stickerEarned')}
          targetRef={slotRef}
          onLanded={handleLanded}
        />
      )}
    </div>
  );
}
