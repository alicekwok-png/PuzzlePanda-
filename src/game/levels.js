// Level definitions: 10 chapters x 5 levels = 50 levels total.
// Difficulty is controlled by grid `size` (an size x size sliding jigsaw)
// and by `hints` (fewer hints available for later, harder levels).
// Photos live in public/images/chapters/<chapterKey>-<levelInChapter>.jpg.

// 章節名不再寫死在這裡。`key` 同時是圖片檔名前綴與 i18n key 的後半段，
// 畫面上一律用 t(`chapters.${chapter.key}`) 取名，見 src/locales/*.json。
export const CHAPTERS = [
  { id: 1, key: 'ch01' },
  { id: 2, key: 'ch02' },
  { id: 3, key: 'ch03' },
  { id: 4, key: 'ch04' },
  { id: 5, key: 'ch05' },
  { id: 6, key: 'ch06' },
  { id: 7, key: 'ch07' },
  { id: 8, key: 'ch08' },
  { id: 9, key: 'ch09' },
  { id: 10, key: 'ch10' },
];

// Difficulty curve (by absolute level number 1-50), matching the reference
// app's pacing (6x6 already by level 6-7) plus a 7x7 mobile ergonomic
// ceiling. From level 13 onward the grid stays at 7x7 and difficulty comes
// from fewer hints (and, for chapters 9-10, photos that are intentionally
// harder to visually tell apart).
/* 睇圖（peek）配額：全部 50 關一律 3 次，不隨章節或棋盤大小調整。
   理由見 design/peek-feature-spec.md —— 第 9、10 章的難度來自照片內容
   本身重複（整幅都是星星／燈火），看了原圖也很難記住哪顆對哪顆，peek
   對這兩章的幫助本來就有限，不必再人為扣它們的額度。 */
const PEEKS_PER_LEVEL = 3;

function tierConfig(levelNumber) {
  if (levelNumber <= 2) return { size: 4, hints: 3 };
  if (levelNumber === 3) return { size: 5, hints: 3 };
  if (levelNumber <= 6) return { size: 6, hints: 2 };
  if (levelNumber <= 12) return { size: 7, hints: 2 };
  /* 第 9 章「星空」（第 41–45 關）整章下調：7×7/1 提示 → 6×6/2 提示。
     不是單一關卡的問題，是整章結構性偏難 —— 整幅都是星點、對比色差細，
     連 peek 與 hint 的實際幫助都特別小（「睇咗都記唔實」）。
     見 design/difficulty-tuning-spec.md。
     第 10 章（城市夜景）這次刻意不動，等這裡的實際效果出來再決定。 */
  if (levelNumber >= 41 && levelNumber <= 45) return { size: 6, hints: 2 };
  return { size: 7, hints: 1 };
}

export const LEVELS = CHAPTERS.flatMap((chapter, chapterIndex) =>
  Array.from({ length: 5 }, (_, i) => {
    const levelInChapter = i + 1;
    const levelNumber = chapterIndex * 5 + levelInChapter;
    const cfg = tierConfig(levelNumber);
    return {
      id: levelNumber,
      chapterId: chapter.id,
      // 存 key 不存名字 —— 名字要等執行期才知道用哪個語言。
      // （舊的 `name` 欄位已移除：它從頭到尾沒有任何地方讀取過。）
      chapterKey: chapter.key,
      levelInChapter,
      peeks: PEEKS_PER_LEVEL,
      theme: {
        id: `${chapter.key}-${levelInChapter}`,
        background: `url('/images/chapters/${chapter.key}-${levelInChapter}.jpg')`,
      },
      ...cfg,
    };
  })
);
