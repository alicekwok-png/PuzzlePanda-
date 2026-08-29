/* 引擎測試： node --test src/game/engine.test.js  （或 npm test）
   ------------------------------------------------------------------
   兩組重點：

   ① 提示 —— 舊版揀「淨賺最多接合」嗰步，喺棋盤中間砌起一嚿擺錯位嘅
      雲團一樣可以賺接合，跟住又要拆返，一路撳會兜圈永遠砌唔完。

   ② 黐咗唔拆得開 —— Alice 報過「放一塊落去，砌好咗嗰嚿就散返開」。
      而家接合係「砌啱位先黐」，黐咗＝已經歸位，所以鎖死咗郁唔到。
      下面幾個 case 就係守住呢條規矩同埋守住「永遠有得郁」。 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bondedDown,
  bondedRight,
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

/* ==========================================================================
   黐咗就唔拆得開
   --------------------------------------------------------------------------
   Alice 報嘅問題：砌好咗一嚿，放另一塊落去嗰嚿就會散返開。
   呢組測試守住條規矩本身，同埋守住「唔會因為條規矩太硬而卡死」。
   ========================================================================== */

/** 而家棋盤上所有接合，用「邊兩塊」表示。 */
function pairsOf(board) {
  const { cells, size } = board;
  const pairs = new Set();
  for (let i = 0; i < cells.length; i++) {
    if (bondedRight(cells, size, i)) pairs.add(`${cells[i]}-${cells[i + 1]}`);
    if (bondedDown(cells, size, i)) pairs.add(`${cells[i]}-${cells[i + size]}`);
  }
  return pairs;
}

test('任何一步落得嘅棋，都唔會拆散本來黐住嘅塊', () => {
  for (const size of [3, 4, 5]) {
    for (let trial = 0; trial < 40; trial++) {
      let board = generateBoard(size);
      for (let step = 0; step < 40; step++) {
        const from = Math.floor(Math.random() * board.cells.length);
        const to = Math.floor(Math.random() * board.cells.length);
        const next = moveGroup(board, from, to);
        if (next === board) continue; // 呢步唔畀行
        const before = pairsOf(board);
        const after = pairsOf(next);
        for (const pair of before) {
          assert.ok(after.has(pair), `${size}×${size}：${from}→${to} 拆散咗 ${pair}`);
        }
        board = next;
      }
    }
  }
});

test('提示行嘅步一樣唔會拆散', () => {
  for (const size of [3, 4, 5]) {
    for (let trial = 0; trial < 40; trial++) {
      let board = generateBoard(size);
      for (let step = 0; step < 40 && !isSolved(board); step++) {
        const hint = findHint(board);
        assert.ok(hint, `${size}×${size}：未砌好但提示乜都俾唔到`);
        const next = moveGroup(board, hint.from, hint.to);
        assert.notStrictEqual(next, board, '提示畀咗一步行唔到嘅棋');
        const after = pairsOf(next);
        for (const pair of pairsOf(board)) {
          assert.ok(after.has(pair), `提示拆散咗 ${pair}`);
        }
        board = next;
      }
    }
  }
});

test('無論點行都唔會行到一個一步都郁唔到嘅盤面', () => {
  const anyMove = (board) => {
    for (let from = 0; from < board.cells.length; from++) {
      for (let to = 0; to < board.cells.length; to++) {
        if (moveGroup(board, from, to) !== board) return true;
      }
    }
    return false;
  };
  for (const size of [3, 4, 5]) {
    for (let trial = 0; trial < 20; trial++) {
      let board = generateBoard(size);
      assert.ok(anyMove(board) || isSolved(board), `${size}×${size}：開局就死`);
      for (let step = 0; step < 60 && !isSolved(board); step++) {
        const from = Math.floor(Math.random() * board.cells.length);
        const to = Math.floor(Math.random() * board.cells.length);
        const next = moveGroup(board, from, to);
        if (next === board) continue;
        board = next;
        assert.ok(anyMove(board) || isSolved(board), `${size}×${size}：行到第 ${step} 步死咗`);
      }
    }
  }
});

test('黐咗嘅塊點拖都郁唔到，亦都唔會被人頂走', () => {
  for (const size of [3, 4, 5]) {
    for (let trial = 0; trial < 30; trial++) {
      let board = generateBoard(size);
      // 先用提示砌到一半，整出一堆已經黐咗嘅塊
      for (let i = 0; i < size * size / 2 && !isSolved(board); i++) {
        const hint = findHint(board);
        board = moveGroup(board, hint.from, hint.to);
      }
      const locked = [...board.placed];
      assert.ok(locked.length > 0, '應該至少黐咗一塊先測到嘢');

      for (const from of locked) {
        for (let to = 0; to < board.cells.length; to++) {
          assert.strictEqual(moveGroup(board, from, to), board, `${from}→${to}：鎖咗都拖得走`);
          assert.strictEqual(moveGroup(board, to, from), board, `${to}→${from}：鎖咗都頂得走`);
        }
      }
    }
  }
});
