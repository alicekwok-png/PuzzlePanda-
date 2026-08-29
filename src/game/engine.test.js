/* 引擎測試： node --test src/game/engine.test.js  （或 npm test）
   ------------------------------------------------------------------
   重點測提示：舊版揀「淨賺最多接合」嗰步，喺棋盤中間砌起一嚿擺錯位
   嘅雲團一樣可以賺接合，跟住又要拆返，一路撳會兜圈永遠砌唔完。
   呢兩個 case 就係捉呢種情況。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bondCountsByPiece,
  bondProgress,
  computePlaced,
  findHint,
  generateBoard,
  isSolved,
  moveGroup,
  swapCells,
} from './engine.js';

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

test('整嚿搬走一嚿已經黐好嘅嘢，唔算新接合', () => {
  const size = 4;
  /* 砌一個盤面：第 0、1 塊喺 0、1 格（黐住），其餘亂擺。
     跟住將呢一嚿搬去第 2、3 格 —— 接合數完全冇變，唔應該當成新接合。
     舊版按「格」數接合，就係喺呢度誤判，玩家拖住一嚿嘢周圍行會一路
     彈 Excellent。 */
  const cells = [0, 1, 5, 4, 8, 2, 6, 7, 3, 9, 10, 11, 12, 13, 14, 15];
  const board = { size, cells, placed: computePlaced(cells) };

  const before = bondCountsByPiece(board);
  const moved = moveGroup(board, 0, 2);
  const after = bondCountsByPiece(moved);

  assert.deepEqual(after, before, '整嚿平移之後，每一塊嘅接合數都應該一模一樣');
  assert.equal(
    bondProgress(moved).bonded,
    bondProgress(board).bonded,
    '整嚿平移唔應該改變總接合數',
  );
});

test('真係黐到新嘢先算數', () => {
  const size = 4;
  // 第 0 塊喺 0 格，第 1 塊擺咗去 5 格（未黐）。將佢搬去 1 格就會黐埋。
  const cells = [0, 4, 2, 3, 8, 1, 6, 7, 5, 9, 10, 11, 12, 13, 14, 15];
  const board = { size, cells, placed: computePlaced(cells) };

  const before = bondCountsByPiece(board);
  const after = bondCountsByPiece(swapCells(board, 1, 5));
  const gained = after.map((c, id) => c - before[id]).filter((d) => d > 0);
  assert.ok(gained.length >= 2, `應該有至少兩塊多咗接合，實際 ${gained.length}`);
});
