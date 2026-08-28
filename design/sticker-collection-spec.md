# 貼紙收藏系統 — 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係喺 `/product-management:brainstorm` 度同產品負責人（Alice）傾好、已經converge嘅決定，唔使再重新諗設計，跟住實作就得。有唔清楚嘅地方，落手前先問返 Alice。

## 背景 / 點解要做

Alice想將「熊貓吉祥物」呢個concept加多一層輕度敘事同collectible玩法：完成一關獲得一張貼紙，儲齊一個chapter嘅5張先解鎖一段chapter過渡動畫。**唔係**傳統對白/劇情分支——熊貓全程唔使講嘢，靠動作、貼紙圖同一句flavour text caption帶感覺就夠。

已經完成pilot驗證（Ocean/ch07）確認角色一致性可行之後，家吓10個chapter嘅50張貼紙同10條chapter過渡片已經全部生成、逐幀檢查過、存放喺 `design/stickers/` 底下，可以交比Claude Code落手實作。

## 已經決定嘅設計（唔使再拗）

1. **每關完成即獲1張貼紙**：每個chapter嘅5關，各自對應1張貼紙（`levelInChapter` 1-5 → `sticker-01.jpg` 到 `sticker-05.jpg`）。完成第N關即代表獲得咗嗰個chapter嘅第N張貼紙。
2. **貼紙狀態100%由現有 `progress.completed` derive，唔使新增storage schema**：一個貼紙「已收集」等於`progress.completed[levelId] === true`。唔使加新field去track邊張貼紙儲咗，因為完全可以由現有數據推導。
3. **細確認（每關）**：完成單一關卡嗰陣，`WinModal`加多一個細嘅「獲得貼紙」提示（縮圖+文字），唔使另開一個畫面，keep喺現有modal入面就得。
4. **大時刻（chapter完成，即第5關）**：完成一個chapter嘅第5關（即5/5）嗰刻，額外觸發一個獨立嘅「chapter過渡」畫面——播放10秒過渡片（素色熊貓變身做嗰個chapter主題裝扮）、顯示一句flavour text caption、然後先返去level select。**淨係喺完成一個chapter嘅最後一關嗰下觸發一次**，唔係每次完成關卡都觸發；重玩已完成嘅關卡（例如撳「再玩一次」）唔應該再觸發（見下面「觸發時機」點樣處理呢個idempotency）。
5. **10個chapter嘅過渡片全部已經配好對應貼紙嘅角色裝扮**（例如Ocean着潛水鏡、星空着太空衣、城市夜景着皮褸），已經逐條人工驗證過同對應chapter嘅sticker-05一致。

## Assets 位置同映射

全部assets喺 `design/stickers/<folder>/`，10個chapter同`levels.js`嘅`CHAPTERS`一一對應：

| chapter key | folder | 5張貼紙 | 過渡片（用呢條，唔係`transition-final.mp4`） |
|---|---|---|---|
| ch01 | `ch01-nature` | `sticker-01.jpg`~`sticker-05.jpg` | `transition.mp4` |
| ch02 | `ch02-panda` | 同上 | `transition.mp4` |
| ch03 | `ch03-cats` | 同上 | `transition.mp4` |
| ch04 | `ch04-floral` | 同上 | `transition.mp4` |
| ch05 | `ch05-dessert` | 同上 | `transition.mp4` |
| ch06 | `ch06-art` | 同上 | `transition.mp4` |
| ch07 | `ch07-ocean` | 同上 | `transition.mp4` |
| ch08 | `ch08-landmarks` | 同上 | `transition.mp4` |
| ch09 | `ch09-starry` | 同上 | `transition.mp4` |
| ch10 | `ch10-citynight` | 同上 | `transition.mp4` |

**⚠️ 技術位要留意（同audio嗰次一樣性質嘅坑）**：AI生片工具原始輸出係**HEVC(H.265)** codec（`transition-final.mp4`），呢個喺唔少Android WebView裝置度冇hardware/software decode支援，播唔到（iOS問題反而細啲，但求穩陣兩邊都要work）。我已經幫手用ffmpeg全部轉咗做**H.264 + AAC + faststart**（`transition.mp4`，同一個資料夾入面），Claude Code**請用`transition.mp4`呢條，唔好用`transition-final.mp4`**（HEVC原始版留喺度純粹做reference，唔使搬去`public/`）。每條大約2.6-3.9MB，10條加埋大約31MB，正常mobile app bundle size可以負擔。

**建議搬去 `public/stickers/<chapterKey>/` 底下**（例如 `public/stickers/ch01/sticker-01.jpg`、`public/stickers/ch01/transition.mp4`），跟現有 `public/images/chapters/` 嘅擺法一致，唔使自己諗新架構。

## 觸發時機（實作位置）

`src/components/GameScreen.jsx`，`handlePointerUp()`入面現有嘅 `isSolved(newBoard)` 判斷區塊（大約第100-104行）：

```js
if (isSolved(newBoard)) {
  setTimeout(() => setWon(true), 350);
  markLevelComplete(level.id, moves + 1, totalLevels);
  showLevelCompleteAd();
}
```

`markLevelComplete()`（`src/game/storage.js`）已經會更新`progress.completed`同`progress.unlocked`，並且return更新後嘅`progress`。攞呢個return值，配合`level.chapterId`同`level.levelInChapter`，可以計到：

```js
// 呢啲對照返 LevelSelect.jsx 現有嘅 completedCount 計法
const chapterLevelIds = LEVELS.filter(l => l.chapterId === level.chapterId).map(l => l.id);
const completedBefore = chapterLevelIds.filter(id => id !== level.id && progressBeforeThisCall.completed[id]).length;
const completedAfter = chapterLevelIds.filter(id => updatedProgress.completed[id]).length;
const justCompletedChapter = completedBefore < 5 && completedAfter === 5;
```

當`justCompletedChapter === true`，先播「大時刻」chapter過渡（見下面新component），先過先返去正常嘅`WinModal`流程（或者chapter過渡本身包住埋WinModal都得，UI流程細節由Claude Code判斷邊種體驗順啲，但兩者都要出現，唔可以漏咗其中一個）。

**呢個計法本身已經處理咗idempotency**：如果玩家事後重玩（撳「再玩一次」）已完成嘅第5關，`completedBefore`已經係5（因為個level本身之前已經complete過），`completedBefore < 5`嗰個condition唔會再滿足，唔會重複觸發chapter過渡。**唔使額外加一個「呢個chapter過渡播過未」嘅storage flag**。

## 新UI：Chapter過渡畫面

建議新增 `src/components/ChapterTransition.jsx`，一個全螢幕overlay（同而家`WinModal`嘅`.modal-overlay`類似風格），內容：

1. `<video>` 元素，`src`指向嗰個chapter嘅`transition.mp4`，autoplay、muted（mobile autoplay政策要求）、`playsInline`（唔可以喺iOS撳咗自動全螢幕）、播完（10秒）自然停喺最後一幀，唔loop。
2. 片播完之後（或者用一個「繼續」button唔等佢自然播完，UI細節Claude Code判斷），顯示嗰句flavour text caption（文字內容見下面，已經3語言譯好放咗喺`i18n-strings-draft.json`）。
3. 一個「繼續」／「下一站」button，撳咗先返去level select（跟返`onExit`個pattern，`App.jsx`嗰邊個flow）。

**細確認（每關WinModal）**：`src/components/WinModal.jsx`加一小段，顯示啱啱獲得嘅嗰張貼紙縮圖（`level.chapterId` + `level.levelInChapter` 對應返上面個映射表），文字可以簡單一句「獲得新貼紙」（i18n key自己加，跟`i18n-strings-draft.json`現有嘅key風格），唔使額外做動畫，靜態顯示張圖已經夠。

## Flavour text captions（10句，已經3語言譯好）

已經加咗落 `design/i18n-strings-draft.json`（見同目錄，key係`chapterTransition.ch01`到`ch10`），每句對應「啱啱完成嗰個chapter」呢一刻嘅心情，帶少少去下一個chapter嘅期待感，唔係對白，係narrator口吻嘅caption：

| chapter | zh-Hant caption |
|---|---|
| ch01 | 五段山林足跡都已收集，下一站，回到熊貓的老家。 |
| ch02 | 竹林裡的溫暖時光留住了，接下來要去見見貓咪鄰居。 |
| ch03 | 毛線球和貓耳都收藏好了，是時候到花田走走。 |
| ch04 | 花冠戴好了，甜點店的香氣正飄過來。 |
| ch05 | 蛋糕吃飽了，拿起畫筆，去畫一片新天地。 |
| ch06 | 調色盤收好了，大海正在遠方閃閃發光。 |
| ch07 | 潛水裝備脫下來，換上背包，準備環遊世界名勝。 |
| ch08 | 地圖收起來了，夜空中的星星正在呼喚。 |
| ch09 | 星星摘下來了，城市的霓虹燈正在發亮。 |
| ch10 | 全部10段旅程都完成了！熊貓的相簿集齊50張回憶，謝謝一路同行。 |

（簡體/英文版本已經一齊寫咗落`i18n-strings-draft.json`，唔喺呢度重複列。ch10嗰句係全遊戲finale文案，唔係去「下一個chapter」，要留意）

## 驗收標準

- 完成任何一關，`WinModal`顯示到啱啱獲得嗰張貼紙嘅縮圖。
- 完成一個chapter嘅第5關（且係首次完成，非重玩），觸發chapter過渡畫面：播`transition.mp4`（H.264版本，唔係HEVC）、顯示對應嗰句caption（跟現有語言設定顯示3語言其中一種）、撳「繼續」返去level select。
- 重玩已完成嘅第5關（`progress.completed`裡面早已經係`true`），唔會重複觸發chapter過渡。
- Chapter 10（最後一個chapter）完成，caption顯示嘅係finale文案（「全部10段旅程都完成了...」），唔係「下一站」文案。
- 貼紙圖同過渡片全部用返`public/stickers/`底下嗰批（H.264版本），冇漏用HEVC原始版。
- `i18n-strings-draft.json`嘅`chapterTransition.ch01`~`ch10`3語言key全部跟返現有i18n架構讀取（跟`design/i18n-spec.md`嗰個做法一致）。

## 明確唔喺呢次scope入面（parked，記低但今次唔做）

- **持久貼紙相簿/collection畫面**：而家設計淨係喺chapter過渡嗰一刻閃現5張貼紙，冇一個地方可以之後翻返去睇晒全部已收集嘅貼紙。呢個Alice未confirm要唔要做，如果之後想加，建議喺`App.jsx`加一個新screen state，UI可以參考`LevelSelect.jsx`嘅grid pattern，資料一樣可以由`progress.completed`derive，唔使新增storage。
- 貼紙分享/匯出到相簿——parked。
- Chapter過渡片攞rewarded ad補充（同peek/hint嗰種ad機制一齊諗）——parked。
