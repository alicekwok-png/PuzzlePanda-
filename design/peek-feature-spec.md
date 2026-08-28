# 拼圖預覽（Peek）功能 — 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係喺 brainstorm 度同產品負責人（Alice）傾好、已經converge嘅決定，唔使再重新諗設計，跟住實作就得。有唔清楚嘅地方，落手前先問返 Alice。

## 背景 / 點解要做

現時7×7關卡（Level 7-50，見 `src/game/levels.js` 嘅 `tierConfig`）board只顯示打亂咗嘅拼圖塊，玩家好難記得成幅相原本點樣——尤其後段刻意揀「對比色差細、內容重複」嘅相嚟做難度嘅 Chapter 9 星空、Chapter 10 城市夜景。

現有嘅💡提示（hint）解決嘅係「呢粒應該擺喺邊」，唔解決「成幅相原本係點樣」——兩個係唔同問題，要分開兩個獨立機制，唔好合併。

## 已經決定嘅設計（唔使再拗）

1. **獨立配額**：新增一個「睇圖」（peek）功能，配額同💡hint完全分開計數，唔共用同一個數。
2. **Flat 3次/關**：全部50關都係3次，唔按chapter或size調整。原因：Chapter 9/10嘅難度嚟自相片內容本身重複（例如成幅都係星星），就算睇咗成幅原圖都好難記實邊粒星對邊粒星，peek對呢兩個chapter嘅幫助本身就有限，唔使人為再扣佢哋嘅peek額，keep flat簡單啲。
3. **撳「重新開始」reset**：同而家 `GameScreen.jsx` 嘅 `resetLevel()` 入面 `hintsLeft` reset返去 `level.hints` 嘅行為一致，peek次數都要喺 `resetLevel()` reset返去level嘅peek上限。
4. **顯示方式（撳住先顯示，一鬆手即收）**：手指撳落👁掣個瞬間，全螢幕overlay即時顯示完整未切割原圖；一鬆手，overlay即刻收返、返去board繼續玩。呢個press-and-hold做法本身已經有代價——撳住嗰陣冇得同時拖拽拼圖塊。**唔係**tap開／再tap close嘅toggle，**冇**auto-timer（release即收，唔使計時）。
5. **配額同時保留**：即使有press-and-hold嘅physical代價，仍然加多一重限制——每關3次。每一次「撳落→鬆手」算1次使用，唔理中途held咗幾耐都係算1次；用晒3次之後個👁掣要disable（同💡hint用晒disable嘅UI處理一致）。
6. **UI風格**：跟現有💡hint chip視覺風格一致（同一個 `.icon-btn` 系列），喺 top-bar 嘅 `.top-bar-actions` 度加多一個 👁 計數chip，放喺 ↺undo 同 💡hint 之間或之後都得，睇返實際排版順唔順眼。

## 現有架構參考

- `src/game/levels.js` — `LEVELS` array，每個level有 `size`、`hints`。要加一個 `peeks: 3`（flat，用同一個tierConfig或新增一個常數都得）。
- `src/components/GameScreen.jsx` — 主遊戲畫面。`hintsLeft`/`hint`/`won` 等state同 `resetLevel()` 都喺呢度，peek嘅state（例如 `peeksLeft`、`isPeeking`）應該跟同一個pattern加落去。
- `src/components/PuzzlePiece.jsx` — 個別拼圖塊render，peek overlay唔改呢個component，係加喺board層面之上。
- `src/index.css` — 現有 `.icon-btn`、`.feedback-badge`、`.board-wrap { position: relative }` 手法可以參考；新增一個類似 `.peek-overlay` 嘅class，覆蓋成個board（`position: absolute; inset: 0`），`background-image` 直接用 `level.theme.background`（呢個field已經係未切割嘅原圖URL，唔使新增素材）。

## 驗收標準

- 👁掣係press-and-hold：`pointerDown` 即顯示overlay並扣1次配額，`pointerUp`/`pointerLeave`（手指郁走出個掣範圍）即隱藏overlay返去board。唔係click toggle。
- 每關最多用3次（`peeksLeft` 到0），用晒之後個掣要disable，唔會再pointerDown到。
- 撳「重新開始」之後，peek次數同hint次數要一齊reset返晒（喺 `resetLevel()` 入面一齊reset）。
- Overlay顯示緊嘅時候（即手指仍然撳住嗰陣），board底下嘅拖曳/交換操作要暫停，唔可以隔住overlay都拖到嘢（例如另一隻手指同時操作board）。
- 離開關卡（返返去level select）唔需要保留peek狀態，同而家其他per-level game state一樣，離開就reset，唔使存落 `storage.js`。

## 明確唔喺呢次scope入面（parked，唔使做）

- Peek次數用廣告補充（rewarded ad refill）——之後先再諗。
- 「零peek過關」成就/badge——parked。
