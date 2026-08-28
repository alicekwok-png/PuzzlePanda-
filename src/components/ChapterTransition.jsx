import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';

/* ==========================================================================
   章節過渡：完成一章第 5 關（且首次完成）時的「大時刻」
   --------------------------------------------------------------------------
   播 10 秒過渡片（素色熊貓換上該章主題裝扮），播完顯示該章的 caption，
   撳「繼續」返關卡選擇。

   ⚠️ 用 public/stickers/<chapterKey>/transition.mp4 —— 這是 H.264 版本。
   AI 生片工具原始輸出是 HEVC（design/ 下的 transition-final.mp4），
   在不少 Android WebView 上完全解不到。跟音效 .ogg → .mp3 同一類坑。

   播放保險：
   - muted + playsInline 才能自動播（手機自動播放政策）
   - 12 秒保險計時器；載入失敗或播不動一律直接顯示 caption
   - 絕對不能把玩家卡在這一頁
   ========================================================================== */

const FALLBACK_MS = 12000;

export default function ChapterTransition({ chapter, onContinue }) {
  const t = useT();
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
    };

    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
        return;
      }
    } catch {
      /* matchMedia 不可用就照常播 */
    }

    const video = videoRef.current;
    if (!video) {
      finish();
      return;
    }
    video.play().catch(finish); // 播不動就直接跳到 caption

    const timer = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  function handleContinue() {
    feedback.tap();
    onContinue();
  }

  return (
    <div className="screen transition-screen">
      <video
        ref={videoRef}
        className="transition-video"
        src={`/stickers/${chapter.key}/transition.mp4`}
        muted
        playsInline
        preload="auto"
        onEnded={() => setEnded(true)}
        onError={() => setEnded(true)}
      />

      <div className={`transition-caption${ended ? ' is-shown' : ''}`}>
        <p className="transition-text">{t(`chapterTransition.${chapter.key}`)}</p>
        <button type="button" className="primary-btn" onClick={handleContinue}>
          {t('chapterTransition.continueButton')}
        </button>
      </div>

      {/* 播放途中也給一個出口 —— 不強迫看完 */}
      {!ended && (
        <button type="button" className="intro-skip" onClick={() => setEnded(true)}>
          {t('intro.skip')}
        </button>
      )}
    </div>
  );
}
