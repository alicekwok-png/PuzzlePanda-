# Toolbar Icon Set — 素材交收

4個icon已經處理好：去咗底色（透明PNG）、裁到方形、統一256×256、白色glyph（`#f4f2ff`，同 `--text` 一致）。

| 檔案 | 對應現有emoji | 用喺邊 |
|---|---|---|
| `back.png` | ← | `GameScreen.jsx` / `LevelSelect.jsx` 嘅返回掣 |
| `undo.png` | ↺ | `GameScreen.jsx` 復原掣 |
| `hint.png` | 💡 | `GameScreen.jsx` 提示掣（原本 `💡{hintsLeft}`，掣入面仲有個數字，圖要同數字並排） |
| `peek.png` | 👁（新） | 睇圖掣，跟 `peek-feature-spec.md` 加嗰個新按鈕 |

## 點用

`.icon-btn` 而家係40×40嘅按鈕，`background: var(--bg-panel)`。呢4張圖本身已經去晒底色淨係得個白色glyph，可以直接當`<img>`塞入button，或者轉做`<svg>` inline（睇Claude Code慣用邊種做法）。建議render大細24×24到28×28（依家button係40×40，留返padding）。

`disabled`狀態現有CSS已經有`opacity:0.35`規則，套用喺呢啲img/svg上都應該一樣work，唔使額外加嘢。

原始素材（1254×1254，未去底色）留咗喺同一個資料夾方便日後重新處理：`_source_back.png`、`_source_undo.png`、`_source_hint.png`、`_source_peek.png`——如果唔需要可以唔理，Claude Code只要用返上面4張加工好嘅`.png`就夠。
