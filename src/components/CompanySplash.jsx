import { useEffect, useRef, useState } from 'react';

/* ==========================================================================
   公司 splash（de stijl）
   --------------------------------------------------------------------------
   開 App 見到嘅第一個畫面：白底、logo 靜態擺中間、約兩秒，跟住先入
   PuzzlePanda 嘅開場動畫。

   ⚠️ 刻意唔做動畫、唔畀撳走：
   - Logo 唔郁 —— 呢個係公司識別，唔係表演。
   - 唔收 tap —— 得一秒，加咗個「撳咗就跳」反而會令玩家喺開場動畫嗰度
     多撳一下，連埋開場都跳埋。
   頭尾都做 fade：入場唔會一開波就硬生生彈個 logo 出嚟，退場都唔會由
   白底硬切去開場片第一格嗰下閃。

   ⚠️ 唔可以用系統嗰個 native splash 代替：Capacitor 嘅 native splash 喺
   WebView 未起身之前顯示，收唔到我哋控制，而且 iOS / Android 兩邊行為唔
   一樣。呢個係 React 畫面，兩邊完全一致。
   ========================================================================== */

/** 靜態停留幾耐（頭尾嘅 fade 都唔計落去）。 */
const HOLD_MS = 2000;
/** 入場／退場 fade 各自幾耐。要同 CSS 入面 .company-splash 嘅 transition 一樣。 */
const FADE_MS = 220;

export default function CompanySplash({ onFinish }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    /* 雙重 requestAnimationFrame：一定要等瀏覽器真係畫咗 opacity:0 嗰一幀，
       先切去 opacity:1，唔係嘅話兩個狀態會迫喺同一幀度發生，transition
       播唔到，睇落同冇 fade 一樣係一開波就出現。 */
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });

    const fade = setTimeout(() => setLeaving(true), FADE_MS + HOLD_MS);
    const done = setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinish();
    }, FADE_MS + HOLD_MS + FADE_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [onFinish]);

  return (
    <div
      className={`screen company-splash${visible ? ' is-visible' : ''}${leaving ? ' is-leaving' : ''}`}
    >
      <img
        className="company-splash-logo"
        src="/icons/destijl-logo.webp"
        alt="de stijl Technology Network int'l"
      />
    </div>
  );
}
