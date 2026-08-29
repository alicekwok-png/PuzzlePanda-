# 每日任務（Daily Mission）— 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係全新feature，之前project入面完全冇相關spec/code（已經search過confirm），跟住呢份由零開始嘅設計去實作就得。

## 背景 / 點解要做

Alice攞咗參考app（Jigsawcard Solitaire）嘅screenshot，見到佢哋首頁有個「每日」月曆icon（帶鎖，未解鎖時顯示lock），想PuzzlePanda都加返類似嘅每日任務功能。呢個係之前討論已經想加、但一直未落實嘅功能。

## 已經決定嘅設計

### 解鎖條件
- 完成**第10關**之後先解鎖每日任務功能。之前（Level 1-9未完成）entry icon顯示鎖住狀態（跟參考圖嗰種padlock badge造型）。

### 任務內容：具體挑戰任務，每日隨機一個
唔係淨係「開咗game就算」呢種最簡單嘅check-in，都唔係要新增計時器呢類新追蹤機制——揀咗喺**現有已經有追蹤緊嘅數據**（`hintsLeft`用剩幾多、`bestMoves`步數紀錄）之上設計任務，咁樣唔使新增額外instrumentation：

任務池（每日凌晨/開game嗰陣，隨機揀一個）：
1. **零提示過關**——完成任何一關，全程冇用過hint。
2. **刷新個人紀錄**——完成任何一關，用嘅步數少過嗰關現有嘅`bestMoves`紀錄（如果嗰關未有`bestMoves`紀錄，呢個任務當日唔會揀中，改揀第3項）。
3. **完成任何一關**——最基本嘅fallback任務，確保就算揀中都一定做得到，唔會出現「今日任務做唔到」嘅情況。

三選一隨機揀，Claude Code可以用簡單嘅`Math.random()`揀，唔使做防止連續兩日重複嘅邏輯（唔係關鍵決定）。

### 獎勵：用返現有機制，唔開新貨幣
**唔新增任何金幣/花瓣/寶石呢類新資源系統**——`ui-design-system-spec.md`度已經明確parked咗「實際資源/貨幣系統」呢一項，呢次唔reopen。

獎勵用返遊戲已有嘅「hint」概念：完成每日任務，畀**1個額外hint**，存做一個簡單嘅全域計數（例如`storage.js`加一個`bonusHints: 0`欄位）。呢個bonus hint喺玩家下一次開始（或者揀）任何一關嗰陣，自動加落嗰關嘅`hintsLeft`初始值度（例如原本呢關係2個hint，有1個bonus就變3個），用完即銷，唔使做「揀邊關用」呢種UI，簡單直接。

### Data model（新增，`src/game/storage.js`）
喺現有`{ unlocked, completed, bestMoves }`結構之上，加多兩個欄位：
```js
{
  unlocked: 1,
  completed: {},
  bestMoves: {},
  dailyMission: {
    date: '',        // 'YYYY-MM-DD'，本地裝置日期，比對呢個判斷今日任務未攞定已攞
    taskType: '',     // 'no-hint' | 'beat-best' | 'any-level'
    claimed: false,   // 今日獎勵攞咗未
  },
  bonusHints: 0,       // 累積未用嘅bonus hint數量
}
```
- 每次打開app（或者打開每日任務畫面），比較`dailyMission.date`同今日本地日期：唔同就當新一日，重新隨機揀`taskType`、`claimed`reset做`false`。
- 完成一關嗰刻，順便check吓岩唔岩今日個task condition（例如`taskType === 'no-hint'`同埋呢鋪冇用過hint），岩就將`claimed`設做`true`，`bonusHints += 1`。
- 呢個純粹係本機local date-based邏輯，冇後端/帳號概念，跟現有`storage.js`全部用localStorage嘅做法一致，唔使新增API/伺服器邏輯。

### UI入口
- 跟參考圖嗰個位置感——首頁上方，同設定齒輪掣同一行或者附近，用月曆／calendar造型icon（同其他icon一樣，插畫風格、唔係emoji）。
- 未解鎖（Level 1-9未完成）：icon顯示灰暗/半透明狀態＋padlock badge，撳落去可以提示「完成第10關解鎖」，唔使做複雜彈窗。
- 已解鎖：icon正常顯示，今日任務未攞就有一個小紅點/badge提示，撳入去見到今日任務內容（例如「零提示完成任何一關」）同埋完成狀態，完成咗會有勾號/慶祝效果。
- Icon圖案由Alice提供（同其他icon一致嘅插畫風格），呢份spec淨係定行為，唔提供實際圖檔。

## 驗收標準
- Level 1-9未完成之前，每日任務icon顯示鎖住狀態，撳落去唔會打開任務內容。
- Level 10完成之後，icon變成可用狀態。
- 每日任務內容喺三個task type之間隨機揀一個，換日（本地日期）自動reset。
- 完成符合條件嘅一關之後，`bonusHints`加1，`dailyMission.claimed`變`true`，同一日之內唔會再重複攞獎勵。
- Bonus hint會自動加落玩家下一關嘅初始`hintsLeft`，用完即銷，冇新增任何貨幣/資源UI。
- 完全冇改動現有`completed`/`bestMoves`嘅寫入邏輯同意思。

## 明確唔喺呢次scope入面（parked）
- 連續登入streak顯示/獎勵——今次唔做，淨係做單日任務。
- 金幣/花瓣等新貨幣系統——維持`ui-design-system-spec.md`原本嘅parked決定，唔喺呢次reopen。
- 每日任務內容擴展（例如加更多task type、按chapter主題變化）——今次淨係3個基本task type，未來想加可以再傾。
