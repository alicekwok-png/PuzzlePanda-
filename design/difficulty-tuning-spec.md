# Chapter 9（星空）難度調整 — 實作規格

給負責寫呢個功能嘅 Claude Code：呢份係喺 brainstorm 度同產品負責人（Alice）傾好、已經converge嘅決定，唔使再重新諗設計，跟住實作就得。

## 背景 / 點解要做

Alice反映第44關（Chapter 9星空嘅第4關）「不合理地難」：7×7、得1次hint，加上相片內容本身（成幅都係星點、對比色差細）令peek/hint嘅實際幫助都特別細——「睇咗都記唔實」。跟進確認之後，唔係第44關獨立嘅問題，而係**成個Chapter 9（Level 41-45）結構性都係咁**，所以要喺chapter層面調，唔係單一level補丁。

## 已經決定嘅設計

- **Chapter 9（Level 41-45）** 由現有 `{ size: 7, hints: 1 }` 改做 **`{ size: 6, hints: 2 }`**（少13粒、多1次hint）。
- **Chapter 10（城市夜景，Level 46-50）呢次唔改**，維持現有 `{ size: 7, hints: 1 }`。`peek-feature-spec.md`原本都有提過Chapter 10有類似風險，但呢次先淨係處理Chapter 9，等實際效果出咗先再睇要唔要跟Chapter 9做同款調整——唔好搶先一次過兩個chapter都改。
- **Peek功能加網格線輔助**（原本喺brainstorm度提出、幫玩家數緊row/column位置嘅構想）**唔喺呢次scope**，Alice明確話唔調，parked。

## 實作位置

`src/game/levels.js` 嘅 `tierConfig(levelNumber)`：

```js
function tierConfig(levelNumber) {
  if (levelNumber === 1) return { size: 4, hints: 3 };
  if (levelNumber <= 3) return { size: 5, hints: 3 };
  if (levelNumber <= 6) return { size: 6, hints: 2 };
  if (levelNumber <= 12) return { size: 7, hints: 2 };
  if (levelNumber >= 41 && levelNumber <= 45) return { size: 6, hints: 2 }; // Chapter 9 星空 override
  return { size: 7, hints: 1 };
}
```

呢個新增condition要放喺最後嘅`return { size: 7, hints: 1 }`之前，並且明確用`levelNumber >= 41 && levelNumber <= 45`（即Chapter 9），唔好用chapter index間接推導，保持同現有code風格（純數字range判斷）一致。

## 影響範圍

- 只影響Level 41-45（Chapter 9星空）嘅`size`同`hints`，唔影響其他49關。
- 呢個改動係純數值配置，唔涉及UI/component改動；`LevelSelect.jsx`、`GameScreen.jsx`嘅顯示邏輯照跟`level.size`/`level.hints`讀值，唔使改。
- 已經完成嘅star/progress紀錄（`storage.js`）唔受影響，因為`size`/`hints`唔係佢keying嘅field。

## 驗收標準

- Level 41-45（星空Chapter 9全部5關）board係6×6（36粒），提示掣顯示可用3次…唔係，係2次（`hintsLeft`初始值=2）。
- Level 1-40、46-50 完全冇變，數值同改動前一致。
- 已經拼緊嘅存檔（如果有）唔會因為呢個改動而壞——`size`只影響新開始嘅board生成，唔涉及save schema改動。

## Parked（呢次唔做，記低但唔使跟）

- Chapter 10（城市夜景）跟Chapter 9做同款6×6/2-hint調整——等Chapter 9實際效果觀察後再決定。
- Peek功能加網格線overlay（幫玩家數緊row/column位置）——今次唔做。
