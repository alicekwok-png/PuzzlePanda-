import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/context';
import { feedback } from '../services/feedback';

/* ==========================================================================
   開場動畫
   --------------------------------------------------------------------------
   素材：design/intro-animation/intro-final.mp4（原檔是 HEVC/H.265）。
   ⚠️ 已轉成 H.264 放在 public/intro/intro.mp4 —— HEVC 在 Chrome 與 Android
   WebView 大多播不出來，只有 Safari/iOS 穩定支援。這跟音效那邊
   .ogg → .mp3 是同一類問題。

   行為（規格未定，以下是預設值，要改很容易）：
   - 每次冷啟動播一次，播完自動進首頁
   - 點畫面任何地方即跳過
   - 系統開了「減少動態效果」就整段跳過
   - 影片載入失敗、或根本播不動，一律直接進首頁 —— 開場動畫絕對不能
     把玩家卡在門外
   ========================================================================== */

const FALLBACK_MS = 12000; // 比影片長度（10 秒）多一點的保險，避免 ended 事件沒來

export default function IntroScreen({ onFinish }) {
  const t = useT();
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish();
    };

    // 使用者要求減少動態效果就不播
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

    // 先試帶聲播；被自動播放政策擋下就靜音再試一次。
    // 打包成 app 之後 WebView 通常允許帶聲，瀏覽器則會走靜音那條路。
    video.play().catch(() => {
      setMuted(true);
      video.muted = true;
      video.play().catch(finish); // 連靜音都播不動就直接進首頁
    });

    const timer = setTimeout(finish, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  function skip() {
    feedback.tap();
    if (!finishedRef.current) {
      finishedRef.current = true;
      onFinish();
    }
  }

  return (
    <div className="screen intro-screen" onClick={skip}>
      <video
        ref={videoRef}
        className="intro-video"
        src="/intro/intro.mp4"
        poster="/intro/intro-poster.jpg"
        muted={muted}
        playsInline
        preload="auto"
        onEnded={skip}
        onError={skip}
      />
      <button type="button" className="intro-skip" onClick={skip}>
        {t('intro.skip')}
      </button>
    </div>
  );
}
