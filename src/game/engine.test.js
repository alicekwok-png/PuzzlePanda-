/* 引擎測試： node --test src/game/engine.test.js  （或 npm test）
   ------------------------------------------------------------------
   重點測提示：舊版揀「淨賺最多接合」嗰步，喺棋盤中間砌起一嚿擺錯位
   嘅雲團一樣可以賺接合，跟住又要拆返，一路撳會兜圈永遠砌唔完。
   呢兩個 case 就係捉呢種情況。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bondProgress, findHint, generateBoard, isSolved, swapCells } from './engine.js';

test('一路撳提示一定砌得完，而且絕大部分步都見到「黐埋」', () => {
  let steps = 0;
  let bondSteps = 0;
  for (let trial = 0; trial < 300; trial++) {
    const size = 4 + (trial % 4);
    let board = generateBoard(size);
    let guard = 0;
    while (!isSolved(board) && guard++ < 500) {
      const hint = findHint(board);
      assert.ok(hint, `size ${size} 未砌好但搵唔到提示`);
      const before = bondProgress(board).bonded;
      const beforePlaced = board.placed.size;
      board = swapCells(board, hint.from, hint.to);
      const after = bondProgress(board).bonded;
      steps++;
      if (after > before) bondSteps++;
      assert.ok(
        after > before || board.placed.size > beforePlaced,
        `提示冇推進：接合 ${before}→${after}，歸位 ${beforePlaced}→${board.placed.size}`,
      );
    }
    assert.ok(isSolved(board), `size ${size} 淨靠提示砌唔完（用咗 ${guard} 步）`);
  }
  const pct = Math.round((bondSteps / steps) * 100);
  console.log(`   ${steps} 步提示，其中 ${pct}% 即刻黐到`);
  assert.ok(pct >= 90, `太多提示冇黐到嘢：只有 ${pct}%`);
});

test('砌好之後冇提示可畀', () => {
  const size = 5;
  const cells = Array.from({ length: size * size }, (_, i) => i);
  assert.equal(findHint({ size, cells, placed: new Set(cells) }), null);
});
