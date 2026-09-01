// Level definitions: 10 chapters x 5 levels = 50 levels total.
// Difficulty is controlled by grid `size` (an size x size sliding jigsaw)
// and by `hints` (fewer hints available for later, harder levels).
// Photos live in public/images/chapters/<chapterKey>-<levelInChapter>.webp
// （992×1586，5:8）。換相／加相用 scripts/prepare_photos.py，唔好自己手動
// 擺檔 —— 個 script 會順手裁成 5:8、縮到標準尺寸同轉 WebP。

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

/* ==========================================================================
   難度曲線
   --------------------------------------------------------------------------
   逐關寫實 [格數, 提示次數]，唔用 if 串。呢條曲線已經逐關調整過幾次，
   寫成表先至一眼睇到成條線點行，改一關唔會意外拖埋隔籬幾關落水。

   ⚠️ scripts/analyze_difficulty.py 會直接讀返呢個表（正則抽 CURVE 入面
   嘅數字對），所以改完唔使兩邊人手同步。改咗格式記得順手行一次個
   script 確認佢仲讀得到。

   ── 2026-08-29 全面下調 ────────────────────────────────────────────
   原本 50 關入面有 39 關係 7×7（49 格），其中 33 關淨係得 1 次提示。
   實測太辛苦：7×7 喺手機上每格得 47px 闊，砌一關要好耐，而且中段連
   續幾十關都係同一個難度，冇進展感。

   而家改成：4×4 起 → 5×5 → 6×6 佔中段大半 → 7×7 留返做後段高峰。
   提示最少 2 次（唔再有 1 次）—— 提示而家係真係幫你黐埋兩塊，價值高咗
   好多，1 次喺 49 格盤面上根本唔夠喉。

   第 9 章（星空，41–45）維持 6×6：唔係個別關卡問題，係整章結構性偏難
   （成幅都係星點、對比色差細，睇咗原圖都記唔實邊粒對邊粒）。
   見 design/difficulty-tuning-spec.md。
   ========================================================================== */
const CURVE = [
  // 第 1 章 · 街景 —— 教學段，格數細、提示多
  [4, 3], [4, 3], [5, 3], [5, 3], [5, 3],
  // 第 2 章 · 熊貓 —— 帶上 6×6
  [5, 3], [5, 3], [6, 3], [6, 3], [6, 3],
  // 第 3 章 · 貓咪
  [6, 3], [6, 3], [6, 3], [6, 3], [6, 3],
  // 第 4 章 · 花卉
  [6, 3], [6, 3], [6, 3], [6, 3], [6, 3],
  // 第 5 章 · 甜品 —— 提示收到 2 次，章尾帶上 7×7
  [6, 2], [6, 2], [6, 2], [7, 2], [7, 2],
  // 第 6 章 · 藝術
  [7, 2], [7, 2], [7, 2], [7, 2], [7, 2],
  // 第 7 章 · 海洋
  [7, 2], [7, 2], [7, 2], [7, 2], [7, 2],
  // 第 8 章 · 世界名勝
  [7, 2], [7, 2], [7, 2], [7, 2], [7, 2],
  // 第 9 章 · 星空 —— 整章結構性偏難，刻意留喺 6×6
  [6, 2], [6, 2], [6, 2], [6, 2], [6, 2],
  // 第 10 章 · 城市夜景 —— 最後一章，回到 7×7
  [7, 2], [7, 2], [7, 2], [7, 2], [7, 2],
];

/* 睇圖（peek）配額：全部 50 關一律 3 次，不隨章節或棋盤大小調整。
   理由見 design/peek-feature-spec.md —— 第 9、10 章的難度來自照片內容
   本身重複（整幅都是星星／燈火），看了原圖也很難記住哪顆對哪顆，peek
   對這兩章的幫助本來就有限，不必再人為扣它們的額度。 */
const PEEKS_PER_LEVEL = 3;

function tierConfig(levelNumber) {
  const [size, hints] = CURVE[levelNumber - 1];
  return { size, hints };
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
        background: `url('/images/chapters/${chapter.key}-${levelInChapter}.webp')`,
      },
      ...cfg,
    };
  })
);
