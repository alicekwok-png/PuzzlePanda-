# UI視覺設計系統 — 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係全新嘅design system spec，處理Alice反映「而家個介面好似網頁，唔似手機遊戲app」嘅問題。**唔郁拼圖機制**（維持方形N×N滑動拼圖，唔轉六邊形/三角形），**唔郁色系方向**（維持深色主題，唔轉淺色系）——純粹將現有嘅深色主題，由而家扁平、留白過多嘅網頁感，改做圓潤、有立體感、有遊戲感嘅mobile game UI。

## 背景 / 點解要做

Alice攞咗市面上另一隻拼圖app（Jigsawcard Solitaire）個screenshot同PuzzlePanda而家個home screen對比，覺得自己個介面「真係好似網頁」。逐樣拆開睇兩者差異：

參考app有嘅嘢，PuzzlePanda而家冇：
1. **背景有紋理**（淺色棋盤格紋），PuzzlePanda而家係一片死實嘅深藍色（`--bg: #0f1220`），冇任何紋理，大片留白顯得空洞。
2. **每個UI元件都有立體感**——厚身邊、明顯drop shadow、掣底部有深色「側牆」營造3D bevel效果。PuzzlePanda而家啲掣（`.primary-btn`等）雖然都有少少底部漸變陰影，但唔夠厚、唔夠誇張，睇落仲係偏扁平。
3. **資源/數值用badge形式顯示**（icon+數字，圓形/圓角徽章，帶顏色ring同陰影）——例如個flower計數、coin計數、calendar計數。PuzzlePanda而家個home screen完全冇呢類「遊戲化」嘅資源展示元件（現時都未有resource/currency系統，但呢個視覺語言都應該套用喺已有嘅數值顯示位，例如關卡進度、章節進度）。
4. **標題用banner/ribbon造型**（摺角、锯齒邊嘅色塊），唔係淨係打文字。「第1章」嗰種標題處理。
5. **配色更豐富**——參考app每種UI元件都有自己專屬色（金色徽章、綠色進度、粉紅CTA），唔係淨係一種橙色包晒晒。PuzzlePanda而家色系太單一（成個介面淨係橙色+深藍兩種色，冇其他點綴色），對比之下顯得單調。
6. **進度顯示做成實心色塊pill**（例如「11/25」綠色藥丸形），唔係淨係一條幼progress bar。

## 已經決定嘅設計原則

- **維持深色主題**：`--bg: #0f1220`、`--bg-panel: #191d33` 呢兩個底色唔變——已經有好多完成咗嘅spec（貼紙簿kraft紙設計、各種modal風格）built喺深色主題之上，唔重寫。
- **唔郁拼圖機制**：方形N×N滑動拼圖維持原狀，`board { aspect-ratio }`、`tierConfig`呢啲同今日之前處理緊嘅難度/內容spec完全冇關係，唔受呢份文件影響。
- **改嘅係「語言」，唔係「顏色方向」**：即係將扁平嘅深色，改做圓潤/立體/遊戲感嘅深色，唔係轉淺色系。

## 新增/擴展Design Tokens

喺 `src/index.css` 現有嘅 `:root` 色版基礎上（`--bg`、`--bg-panel`、`--text`、`--text-dim`、`--accent`、`--success`、`--danger`、`--card-face`、`--card-back` 呢9個唔變），加多以下幾個：

```css
--accent-gold: #ffc93c;      /* 資源/貨幣類badge用，例如關卡星星、章節完成度 */
--accent-pink: #ff5c8a;      /* 強調CTA用（例如「困難」關卡掣、限時活動），唔好同 --danger 混淆，--danger係錯誤/警示色，--accent-pink係遊戲化強調色 */
--bevel-shadow: rgba(0, 0, 0, 0.45);   /* 立體感掣底部側牆用嘅陰影色 */
--texture-line: rgba(255, 255, 255, 0.03);  /* 深色背景紋理用嘅極淺對比線條色，唔可以太顯眼搶咗內容 */
```

## Component Patterns（全部畫面通用，唔止首頁）

### 1. 背景紋理

`.screen` 呢類全螢幕容器嘅背景，由現有純色 `var(--bg)`，加返一層極淡嘅斜紋/棋盤格紋理（用 `--texture-line` 嗰隻幾乎睇唔到嘅顏色，CSS `repeating-linear-gradient` 或者一張tileable嘅纹理PNG都得，Claude Code自己判斷邊種實作方式方便）。**紋理要淡到唔會搶內容焦點**，純粹打破而家嗰種「一片死色」嘅空洞感，唔係要好搶眼。

### 2. 立體感按鈕（Chunky Button）

現有 `.primary-btn`、`.icon-btn` 呢類掣，加強立體感：
- 底部側牆陰影用 `--bevel-shadow`，thickness增加到4-6px（而家嘅陰影太薄）。
- 掣按落去嗰刻（`:active`）側牆陰影應該壓扁/消失，模擬「撳落去」嘅物理感（如果而家冇呢個interaction，加返）。
- 圓角維持現有大圓角風格（`border-radius`已經夠圓，唔使再加）。

### 3. 數值/進度Badge

凡係顯示數字/進度嘅位（例如`LevelSelect.jsx`嘅完成度、GameScreen嘅hint次數、chapter進度），統一用「圓角pill/圓形badge + icon + 數字」嘅組合展示，唔淨係打一舊文字：
- Badge底色用返對應語意色（進度/成功類 → `--success`綠、資源/星星類 → `--accent-gold`金、強調/困難標籤類 → `--accent-pink`）。
- Badge都要有輕微drop shadow，唔好平貼喺背景度。

### 4. Banner/Ribbon標題

章節名/大標題（例如`chapter-tile-overlay`入面嘅chapter名，或者將來`ChapterTransition.jsx`嘅標題），由純文字改做「摺角/锯齒邊嘅色塊banner」造型包住文字，唔係淨係加粗個字就算。色可以用 `--accent` 或者 `--accent-gold`，睇邊種同附近元件撞色。

### 5b. 進度條熊貓吉祥物點綴

**⚠️ 2026-08-29追加**：Alice攞多一張參考圖（另一隻拼圖app），佢個總進度bar（頂部帶tick分格嗰條，即係真機screenshot見到嘅「X/60」＋星星icon＋3條tick分隔線嗰條——呢個bar本身已經喺線上版本，唔喺呢份project嘅本地code入面，Claude Code自己嗰邊已經有）度，喺3個tick分格位放咗3隻細嘅生物icon做里程碑點綴。Alice想跟呢個做法，用熊貓代替：

- 喺現有「X/60」總進度bar嘅3個tick分隔位，每個位放一隻細熊貓icon（大約32-40px，唔好搶咗條bar本身嘅視覺重量）。
- 3隻熊貓可以係3個唔同姿勢/表情，由第一個（例如專注/努力）到第三個（例如興奮/慶祝「就嚟到喇」），帶少少進度遞進嘅敘事感，唔使做動態切換邏輯，靜態3張圖各自擺喺自己個位就得。
- 圖by Alice自己做，插畫風格、唔係emoji，同`sticker-album-icon.png`嗰種手繪質感一致。建議存做`design/icons/progress-panda-1.png`、`-2.png`、`-3.png`，透明底。
- 淨係加喺總進度bar（跨關卡、頂部嗰條），**唔係**GameScreen入面單一關卡嘅board completion % bar（`.progress-bar-fill`）——兩條bar意義唔同，唔好搞混咗擺埋一齊。

### 5. 進度Pill

現有`.progress-bar-track`/`.progress-bar-fill`（幼長condition bar）之外，喺適合嘅位（例如章節卡完成度「11/25」呢種簡短數字）改用實心色塊pill顯示，唔淨係幼bar。幼bar同pill唔係互斥，可以並存（bar喺game screen度做即時進度、pill喺level-select/首頁度做總覽數字）。

## 套用範圍（全部畫面一齊跟，唔係淨係首頁）

- `home-screen`（首頁）：背景紋理、掣加強立體感、（如果之後有資源系統）資源badge。**⚠️ hero區背景改用專屬puzzle-piece圖，唔係通用`--texture-line`紋理，見下面「2026-08-29更新（追加）：首頁Hero背景圖」section。**
- `LevelSelect.jsx`（章節/關卡選擇）：`chapter-tile`、`level-tile`加立體感陰影，完成度數字改用pill。
- `GameScreen.jsx`：top-bar個啲icon-btn（undo/hint/貼紙簿入口）加立體感，progress數字位可以加badge處理。
- `WinModal.jsx`、`ChapterTransition.jsx`：modal本身背景都可以加返輕紋理，內部按鈕跟返立體感規則。
- `AlbumScreen.jsx`：呢頁本身已經有獨立嘅kraft紙質感spec（`sticker-album-spec.md`），唔使套用呢份文件嘅深色紋理規則——kraft紙背景已經係佢自己嘅「唔似網頁」解法，兩者唔衝突，各自按自己spec嚟。

## 驗收標準

- 首頁背景由死實色變咗有淡紋理，但唔會搶主要內容焦點。
- 主要按鈕（開始遊戲、貼紙簿入口等）睇落有明顯立體/厚身感，唔再係扁平色塊。
- 至少一個數值顯示位（例如關卡完成度）由純文字/幼bar，改用咗badge/pill造型。
- 新增嘅4個CSS token（`--accent-gold`、`--accent-pink`、`--bevel-shadow`、`--texture-line`）加咗落`:root`，同現有9個token並存，冇覆蓋/刪走原有token。
- 深色主題底色（`--bg`/`--bg-panel`）數值完全冇變。
- 拼圖board本身（`.board`嘅grid/aspect-ratio/piece邏輯）完全冇被呢次UI改動觸碰。
- AlbumScreen嘅kraft紙背景維持`sticker-album-spec.md`原本設計，唔套用呢份文件嘅深色紋理規則。

## 2026-08-29更新（追加）：首頁Hero背景圖 + 視覺焦點（首頁專屬，其他screen唔受影響）

**背景**：Alice覺得首頁「單調」，跟進之後喺brainstorm度確認咗真正原因唔係「色彩唔夠」，而係「稀疏、冇視覺焦點」——即係話單純加色相變化解決唔到問題，要加返視覺焦點/裝飾元素先得。已經決定用以下做法，**淨係套用喺首頁hero區**，唔改其他screen嘅背景規則。

### 首頁專屬background（唔套用去其他screen）

- 用Alice提供嘅puzzle-piece主題生成圖做首頁hero區背景，已存做 `design/backgrounds/home-hero-puzzle-glow.png`（941×1672 PNG）——深藍底，四周圍住橙/金/深藍色立體puzzle piece，中間一嚿暖橙色光暈做視覺焦點。
- **淡化程度：好淡，剩返色調同光暈**——puzzle piece要淡到近乎剩低模糊輪廓，睇唔清楚實際形狀細節，主要留低嗰個暖橙光暈氛圍，唔可以保留原圖鮮明度或者中等透明度嗰種「形狀睇得清」效果。實作上可以疊一層高透明度嘅`var(--bg)`喺張圖上面（例如`linear-gradient(rgba(15,18,32,0.75), rgba(15,18,32,0.75)), url(...)`），或者直接將個PNG opacity調到大約15-25%，邊種實作方式Claude Code自己判斷邊樣效果好。
- **範圍：淨係頁面上半部hero區**，落到落面（掣所在嗰個下半部）用CSS gradient漸變返純色`var(--bg)`。原因：呢張係固定比例嘅static圖，唔係可以無限tile嘅紋理，唔同手機螢幕高度會令個圖顯示比例唔一樣，限定喺hero區＋向下漸出，先可以避免唔同screen size走樣/裁得核突。
- 呢個係首頁hero區專屬處理，**唔取代**「Component Patterns 1. 背景紋理」嗰個全screen通用嘅極淡`--texture-line`紋理規則——LevelSelect、GameScreen、modal等其他screen繼續跟返原本嗰條規則，唔套用呢張puzzle-piece圖。

### 首頁焦點內容（喺hero區背景之上）

- **熊貓主視覺**：喺hero區中間（岩岩對住個暖橙光暈焦點）擺一隻熊貓插畫做視覺錨點，插畫風格同`sticker-album-icon.png`／progress-panda果套一致（唔係emoji）。圖由Alice提供，待生成。
- **進度Badge**：跟返上面「Component Patterns 3. 數值/進度Badge」個pattern，喺熊貓主視覺附近加一個「總進度」pill/badge（例如帶icon嘅「12/60」），畀個hero區除咗裝飾之外都有多一層實際資訊。

呢兩樣加埋淡化咗嘅hero背景，一齊解決「稀疏、冇焦點」嘅問題——唔係靠加色彩豐富度嚟解決。

**驗收標準（呢部分）：**
- 首頁hero區見到淡化咗嘅puzzle-piece背景圖，色調同光暈隱約可見，但唔會搶主要內容焦點，puzzle piece細節模糊唔清晰。
- Hero區落到掣所在嘅下半部，背景漸變返乾淨純色`var(--bg)`，冇截斷/走樣感。
- 熊貓主視覺同進度badge都擺咗喺hero區，成頁唔再係「淨係得文字+兩粒掣」咁單薄。
- 其他screen（LevelSelect/GameScreen/modal等）嘅背景紋理規則完全冇變，繼續跟返原本`--texture-line`嗰條，唔套用呢張圖。

## 明確唔喺呢次scope入面（parked）

- 拼圖機制改做六邊形board/三角形拼圖塊——今次確認唔做，維持方形N×N。
- 轉淺色系主題——今次確認唔做，維持深色。
- 實際嘅資源/貨幣系統（金幣、體力等）——今次淨係定咗個badge視覺語言,冇話要新增呢類遊戲機制,如果將來有相關功能就跟返呢個badge樣式做。
