# Toolbar Icon 按鈕樣式 — 「輕微3D」規格

呢份係接住`README.md`嘅icon素材，畀Claude Code套用嘅CSS規格。已經同Alice用mock-up圖confirm咗方向。

## 背景

原本`.icon-btn`係扁平深色方形button（`background: var(--bg-panel)`），Alice參考另一隻遊戲嘅glossy 3D提示掣，覺得而家太平面。三個方案（維持flat / 加輕微3D感 / 全面glossy 3D重做）揀咗中間嗰個：**保留家吓4張line-icon素材唔變，淨係改button本身嘅背景由「深色方形」變做「暖橙色gradient圓形+glossy高光」，加埋一個counter badge**。

## 按鈕本身

- 形狀：由而家嘅`border-radius:12px`方形，改做**正圓形**（`border-radius:50%`）
- 大小：由40×40放大到 **44×44**
- 背景：linear-gradient，由淺到深，用app本身`--accent`(#ff7a59)延伸出嚟嘅色階，唔係憑空揀色：
  ```css
  background: linear-gradient(180deg, #ffb38f 0%, #e85f3d 100%);
  ```
- 頂部玻璃反光（inset highlight）：
  ```css
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),          /* 外陰影，浮起感 */
    inset 0 2px 3px rgba(255, 255, 255, 0.45), /* 頂部高光 */
    inset 0 -3px 4px rgba(0, 0, 0, 0.25);      /* 底部內陰影 */
  ```
- icon本身（`back.png`/`undo.png`/`hint.png`/`peek.png`）維持白色line-icon唔變，render喺button正中央，大小約button直徑嘅50%（即22×22 in 44×44button）
- `disabled`狀態：而家`opacity:0.35`嘅做法繼續用，套喺個圓形button同icon上面就得

## Counter badge（淨係`hint`同`peek`兩個有，`back`/`undo`冇）

顯示剩餘次數（例如`hintsLeft`、`peeksLeft`）嘅細圓形氣泡，疊喺button右上角：

- 位置：疊喺button右上角，大約突出button邊緣一半（`top: -4px; right: -4px`）
- 大小：18-20px直徑
- 背景色：`#4cd964`（綠色，同app而家嘅色系冇衝突，純粹做「數字提示」嘅功能色，唔使跟`--accent`因為要同橙色button本身分得開）
- 邊框：`1.5px solid var(--bg)`（`#0f1220`），等佢喺橙色button上面睇落有分隔，唔會糊埋
- 文字：白色、bold、居中，數字用返而家已經有嘅state（`hintsLeft`/`peeksLeft`）
- 數字變化（用咗一次少一次）淨係換文字內容就得，唔使額外動畫

## 效果參考

已經整咗個mock-up圖畀Alice睇過、confirm咗（`mockup_medium3d.png`，同目錄）。4粒button（返回/復原/提示/睇圖）用同一套gradient+glossy處理，得提示同睇圖兩粒有綠色counter。

## 驗收標準

- 4個icon-btn外觀由方形深色底轉做橙色gradient圓形，白色line-icon置中唔變形
- `hint`、`peek`兩個button右上角有綠色counter badge，數字跟返現有嘅`hintsLeft`/`peeksLeft` state即時更新
- `back`、`undo`冇badge
- disabled狀態（例如`hintsLeft<=0`、`history.length===0`）沿用現有`opacity:0.35`邏輯，唔使新寫
