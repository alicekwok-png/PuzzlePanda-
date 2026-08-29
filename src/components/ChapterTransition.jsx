import { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoSound } from '../hooks/useVideoSound';
import { useT } from '../i18n/context';
import Icon from './Icon';
import { feedback } from '../services/feedback';

/* ==========================================================================
   章節過渡：完成一章第 5 關（且首次完成）時的「大時刻」
   --------------------------------------------------------------------------
   播 10 秒過渡片（素色熊貓換上該章主題裝扮），播完顯示該章的 caption，
   撳「繼續」返關卡選擇。

   ⚠️ 用 public/stickers/<chapterKey>/transition.mp4 —— 這是 H.264 版本。
   AI 生片工具原始輸出是 HEVC（design/ 下的 transition-final.mp4），
   在不少 Android WebView 上完全解不到。

   聲音：這 10 條片都有 AAC 音軌。之前這裡寫死 `muted`，等於那些音軌永遠
   沒人聽過 —— 已改用 useVideoSound，先試帶聲。玩家走到這一刻必然已經
   點過畫面很多次，瀏覽器多數會允許有聲播放；被擋就靜音並顯示喇叭鍵。

   播放保險：12 秒保險計時器；載入失敗或播不動一律直接顯示 caption。
   ========================================================================== */

const FALLBACK_MS = 12000;

export default function ChapterTransition({ chapter, onContinue }) {
  const t = useT();
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
  }, []);

  const { videoRef, muted, toggleSound } = useVideoSound({ onUnplayable: finish });

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
        return;
      }
    } catch {
      /* matchMedia 不可用就照常播 */
    }
    const timer = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [finish]);

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
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />

      <button
        type="button"
        className="video-sound-btn"
        onClick={toggleSound}
        aria-label={muted ? t('video.soundOn') : t('video.soundOff')}
      >
        <Icon name={muted ? 'soundOff' : 'soundOn'} className="icon-btn-svg" />
      </button>

      <div className={`transition-caption${ended ? ' is-shown' : ''}`}>
        <p className="transition-text">{t(`chapterTransition.${chapter.key}`)}</p>
        <button type="button" className="primary-btn" onClick={handleContinue}>
          {t('chapterTransition.continueButton')}
        </button>
      </div>

      {/* 播放途中也給一個出口 —— 不強迫看完 */}
      {!ended && (
        <button type="button" className="intro-skip" onClick={finish}>
          {t('intro.skip')}
        </button>
      )}
    </div>
  );
}
