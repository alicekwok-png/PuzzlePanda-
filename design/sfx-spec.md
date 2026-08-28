# 音效素材交收

8個全部齊晒：`swap`/`tap`/`hint`/`lock`/`undo`/`peek-open`/`peek-close`（Kenney.nl，CC0）+ `win`（Epidemic Sound，**訂閱制授權，唔係CC0**——上架前Alice要自己覆核返個訂閱plan嘅授權條款仲covers唔covers）。

## 一個要留意嘅技術位

原本Kenney.nl個包全部係`.ogg`（Vorbis），但**iOS嘅WKWebView（即Capacitor app喺iOS上面用嗰個內置瀏覽器引擎）唔支援`.ogg`**——Safari家族從來冇support過Ogg/Vorbis呢個格式，得Android/Chrome先播到。所以我已經幫手用ffmpeg全部轉咗做`.mp3`（兩邊都播到），呢度send嘅已經係轉換好嘅版本，唔使再處理。

## 檔案 → 觸發位置

| 檔案 | 事件 | Code位置（`src/components/GameScreen.jsx`） |
|---|---|---|
| `swap.mp3` | 交換拼圖塊（未鎖定） | `handlePointerUp()`，`swapCells`成功之後 |
| `lock.mp3` | 拼中鎖定（`newlyLocked > 0`） | `handlePointerUp()`，`if (newlyLocked > 0)`嗰段 |
| `hint.mp3` | 提示 | `handleHint()` |
| `undo.mp3` | 復原 | `handleUndo()` |
| `tap.mp3` | 一般UI掣（返回/開始遊戲/設定） | `App.jsx`、`LevelSelect.jsx`嘅`.icon-btn`/`.primary-btn`統一用 |
| `peek-open.mp3` | 睇圖 `pointerDown` | 跟`peek-feature-spec.md`新加嗰個peek按鈕 |
| `peek-close.mp3` | 睇圖 `pointerUp`/`pointerLeave` | 同上 |
| `win.mp3` | 過關（`isSolved`） | `handlePointerUp()`，`if (isSolved(newBoard))`嗰段 |

## 建議做法

放入`public/sfx/`，用一個輕量嘅`playSfx(name)` helper（例如`new Audio(\`/sfx/${name}.mp3\`).play()`，或者用Capacitor嘅`@capacitor-community/sound`/`@capacitor/haptics`搭配都得，由Claude Code自行判斷）。冇特別要求要preload定lazy-load，7段檔案體積好細（1.6KB-13KB），preload都應該冇壓力。

## 驗收標準

- 7個觸發位置（連win）都要播到對應聲，`swap`同`lock`要分得開（唔可以每次swap都播`lock`個聲，只有真係鎖定先播）
- iOS真機/模擬器測試要confirm`.mp3`播得到（呢個係之前`.ogg`會炒嘅位）
