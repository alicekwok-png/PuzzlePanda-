import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
   影片播放 + 聲音開關
   --------------------------------------------------------------------------
   手機瀏覽器一律禁止「未經用戶操作就自動播放有聲影片」，這是平台硬性規則，
   繞不過。所以流程是：

   1. 先試帶聲播 —— 桌面、或者用戶之前已經跟這個網域互動過（Chrome 的
      Media Engagement Index）就會成功
   2. 被擋就靜音重試 —— 保證影片一定播得出，不會黑畫面
   3. 靜音時顯示一個喇叭鍵，用戶撳一下就有聲 —— 撳鍵本身就是「用戶操作」，
      政策允許在那一刻解除靜音

   打包成原生 app 之後，WebView 可以設定成不需要用戶操作就播有聲，
   那時第 1 步就會直接成功。見 README。
   ========================================================================== */

export function useVideoSound({ onUnplayable } = {}) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const startedRef = useRef(false);

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video || startedRef.current) return;
    startedRef.current = true;

    video.play().catch(() => {
      // 帶聲被自動播放政策擋下 —— 轉靜音再試一次
      setMuted(true);
      video.muted = true;
      video.play().catch(() => onUnplayable?.()); // 連靜音都播不動
    });
  }, [onUnplayable]);

  useEffect(() => {
    start();
  }, [start]);

  /** 用戶主動撳的那一刻可以合法解除靜音。 */
  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
    if (!next && video.paused) video.play().catch(() => {});
  }, []);

  return { videoRef, muted, toggleSound };
}
