# 多語言（i18n）系統 — 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係喺 brainstorm 度同產品負責人（Alice）傾好、已經converge嘅決定。呢個係v1上架嘅must-have，唔係fast-follow。有唔清楚嘅地方，落手前先問返 Alice。

## 背景 / 點解要做

而家個game全部UI文字都係硬寫死嘅廣東話口語（例如「選擇主題」「淨係」「咁樣」）。而家決定要支援3種語言，等唔講廣東話嘅繁體/簡體/英文用戶都用得。

## 已經決定嘅設計（唔使再拗）

1. **3個語言選項**：
   - 繁體中文（**書面語**，唔係粵語口語——例如「只」唔係「淨係」，「這樣」唔係「咁樣」）
   - 簡體中文（同樣用書面語，唔係廣東話字轉簡體）
   - 英文
   - 即係而家現有嘅粵語口語UI文字，**全部要重寫做書面中文**先可以做繁體版本嘅底稿，唔係簡單繁簡轉換就得。
2. **語言切換擺喺設定畫面**：唔係首次開game問，係一個獨立嘅Settings畫面入面揀。而家個app冇Settings畫面，要新增一個。
3. **App Store/Play Store命名（3個locale統一）**：
   - 唔分中英文名——**全部3個locale（繁體/簡體/英文）Title統一用 "PuzzlePanda"**，冇獨立中文名版本。之前brainstorm有傾過「熊貓拼圖」/「熊猫拼图」等中文方向，但最終決定唔採用，全部語言介面都係「PuzzlePanda」。

## 需要覆蓋嘅內容範圍

- `src/game/levels.js` — `CHAPTERS` 嘅10個chapter名（而家係中英夾雜格式，例如「風景 Nature Landscape」——3種語言版本點處理呢個中英夾雜格式，要同Alice確認：淨係翻譯前半中文部分，定係連英文都要因應語言調整）、50關嘅 `name`（`第 N 關 · ${chapterName}`樣式）。
- `src/App.jsx` — 首頁標題/副標題、「開始遊戲」按鈕。
- `src/components/LevelSelect.jsx` — 「選擇主題」、「返回」、chapter進度顯示（`${completedCount}/5`）。
- `src/components/GameScreen.jsx` — 「復原」「提示」「交換次數」，同埋各按鈕嘅 `aria-label`（`aria-label="返回"`、`aria-label="提示"` 呢類都要跟住換）。
- `src/components/WinModal.jsx` — 過關彈窗全部文案（未讀過呢個檔案內容，落手前自己開返嚟睇）。
- 新增 `src/components/SettingsScreen.jsx` — 語言選擇畫面本身嘅文案。

## 3語言文字內容（已經譯好）

見同目錄 `i18n-strings-draft.json`——所有現有UI字串3語言版本已經譯晒，包括10個chapter名，`home.title` 三語言統一「PuzzlePanda」，全部可以直接用，冇未定項。

## 技術架構建議

- 字串抽出做locale檔，例如 `src/locales/zh-Hant.json`、`src/locales/zh-Hans.json`、`src/locales/en.json`，每個key對應一個UI字串。
- 用邊個i18n方案（react-i18next定自己寫個輕量context）由Claude Code自行判斷，項目本身唔大，揀簡單、無需額外重型依賴嘅方案就得。
- 揀咗嘅語言要persist——建議喺 `src/game/storage.js` 加多一個key（可以獨立一個 `jigsawcard-solitaire-lang-v1`，唔好同 `jigsawcard-solitaire-progress-v1` 混埋，避免將來要動progress schema）。
- 預設語言邏輯：首次開啟時attempt讀取裝置系統語言（`navigator.language`），match到邊個就用邊個，match唔到就fallback去繁體中文。
- Settings畫面入口：而家首頁（`home-screen`）淨係得標題+「開始遊戲」按鈕，冇top-bar。建議喺首頁加一個細嘅設定掣（右上角icon button，跟現有 `.icon-btn` 風格），撳咗先入 `SettingsScreen`；`App.jsx` 要加一個新screen state `'settings'`。

## 驗收標準

- 3個語言之間切換，全部畫面（首頁/主題選擇/關卡選擇/遊戲畫面/過關彈窗/設定畫面本身）文字都要跟住轉，冇漏一句留低舊文字。
- 揀咗嘅語言reload/重開app之後要記得（persist喺storage）。
- 冇match到裝置語言時fallback去繁體中文，唔可以crash或者顯示空白。
- aria-label都要跟住轉語言（唔淨係畫面上肉眼見到嗰啲字）。

## 明確唔喺呢次scope入面（parked）

- RTL（右到左）語言支援——冇呢個需要，3種語言都係左到右。
