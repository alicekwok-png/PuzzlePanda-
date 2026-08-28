import { useCallback, useEffect, useRef } from 'react';
import { useVideoSound } from '../hooks/useVideoSound';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';

/* ==========================================================================
   開場動畫
   --------------------------------------------------------------------------
   素材：design/intro-animation/intro-final.mp4（原檔是 HEVC/H.265）。
   ⚠️ 已轉成 H.264 放在 public/intro/intro.mp4 —— HEVC 在 Chrome 與 Android
   WebView 大多播不出來，只有 Safari/iOS 穩定支援。

   聲音：見 hooks/useVideoSound.js。手機一定會靜音起播（平台規則），
   所以右下角給一個喇叭鍵讓用戶自己開聲。

   行為（規格未定，以下是預設值）：
   - 每次冷啟動播一次，播完自動進首頁
   - 點畫面任何地方即跳過；喇叭鍵與跳過鍵不會觸發跳過
   - 系統開了「減少動態效果」就整段跳過
   - 12 秒保險計時器；播不動一律直接進首頁 —— 開場動畫絕不能把玩家卡在門外
   ========================================================================== */

const FALLBACK_MS = 12000;

export default function IntroScreen({ onFinish }) {
  const t = useT();
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

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

  function skip() {
    feedback.tap();
    finish();
  }

  return (
    <div className="screen intro-screen" onClick={skip}>
      <video
        ref={videoRef}
        className="intro-video"
        src="/intro/intro.mp4"
        poster="/intro/intro-poster.jpg"
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />

      {/* stopPropagation：撳喇叭鍵不應該連帶跳過整段動畫 */}
      <button
        type="button"
        className="video-sound-btn"
        onClick={(e) => {
          e.stopPropagation();
          toggleSound();
        }}
        aria-label={muted ? t('video.soundOn') : t('video.soundOff')}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <button type="button" className="intro-skip" onClick={(e) => { e.stopPropagation(); skip(); }}>
        {t('intro.skip')}
      </button>
    </div>
  );
}
