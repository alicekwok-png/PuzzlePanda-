import { useEffect, useRef, useState } from 'react';

/* ==========================================================================
   公司 splash（de stijl）
   --------------------------------------------------------------------------
   開 App 見到嘅第一個畫面：白底、logo 靜態擺中間、約一秒，跟住先入
   PuzzlePanda 嘅開場動畫。

   ⚠️ 刻意唔做動畫、唔畀撳走：
   - Logo 唔郁 —— 呢個係公司識別，唔係表演。
   - 唔收 tap —— 得一秒，加咗個「撳咗就跳」反而會令玩家喺開場動畫嗰度
     多撳一下，連埋開場都跳埋。
   淨係最後 fade 走，避免由白底硬切去開場片第一格嗰下閃。

   ⚠️ 唔可以用系統嗰個 native splash 代替：Capacitor 嘅 native splash 喺
   WebView 未起身之前顯示，收唔到我哋控制，而且 iOS / Android 兩邊行為唔
   一樣。呢個係 React 畫面，兩邊完全一致。
   ========================================================================== */

/** 靜態停留幾耐（fade 唔計落去）。 */
const HOLD_MS = 1000;
/** Fade 走幾耐。要同 CSS 入面 .company-splash.is-leaving 嘅 transition 一樣。 */
const FADE_MS = 220;

export default function CompanySplash({ onFinish }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), HOLD_MS);
    const done = setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish();
    }, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [onFinish]);

  return (
    <div className={`screen company-splash${leaving ? ' is-leaving' : ''}`}>
      <img
        className="company-splash-logo"
        src="/icons/destijl-logo.webp"
        alt="de stijl Technology Network int'l"
      />
    </div>
  );
}
