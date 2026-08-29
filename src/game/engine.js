// Swap jigsaw engine.
//
// 一張相切成 N × N 塊。每塊的 id 就是它在原圖的位置（0..N²-1）。
// `board.cells[i]` = 現在坐在棋盤第 i 格的那塊的 id。
//
// ── 接合（bond）：這個遊戲的核心概念 ──────────────────────────────
// 兩格「接合」的條件是：它們在棋盤上相鄰，而且它們手上那兩塊在原圖上
// 也是同一種相鄰關係。接合是**相對**的，跟這兩格在棋盤的哪個位置無關 ——
// 就像真實拼圖：你可以在桌上任何地方先砌起一嚿，再整嚿搬去正確位置。
//
// 接合起來的一群格叫一個 cluster。整塊 cluster 平移時，內部所有接合都
// 原封不動保留（因為接合只看相對關係），所以「整嚿搬」才有意義。
//
// `placed`（絕對正確：cells[i] === i）仍然保留，但只用來做視覺提示 ——
// 提示玩家「這一嚿不只砌啱，而且已經在正確位置」。
// 注意：一個 cluster 一係全部 placed、一係全部唔 placed，不會有一半一半
// （若 cells[i]===i 且 i 與 i+1 接合，則 cells[i+1]=i+1，如此類推）。
//
// 任何打亂的排列都必然可解（任何 permutation 都可以靠交換排回 identity），
// 所以不需要死局檢查。

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isIdentity(cells) {
  return cells.every((v, i) => v === i);
}

/** 絕對已歸位（在自己原本那一格）的格座標集合。只用於視覺提示。 */
export function computePlaced(cells) {
  const placed = new Set();
  cells.forEach((pieceId, pos) => {
    if (pieceId === pos) placed.add(pos);
  });
  return placed;
}

/* ---------------------------------------------------------------------------
   接合判斷
   --------------------------------------------------------------------------- */

/** 第 i 格與它右邊那格是否接合（原圖上係鄰居就算，唔理擺喺邊）。 */
export function bondedRight(cells, size, i) {
  if (i % size === size - 1) return false; // 棋盤上已經在最右一列
  const a = cells[i];
  if (a % size === size - 1) return false; // 這塊在原圖上已經在最右一列
  return cells[i + 1] === a + 1;
}

/** 第 i 格與它下面那格是否接合。 */
export function bondedDown(cells, size, i) {
  if (Math.floor(i / size) === size - 1) return false;
  return cells[i + size] === cells[i] + size;
}

/** 第 pos 格四邊各自有沒有接合。 */
export function bondsAt(board, pos) {
  const { cells, size } = board;
  return {
    up: pos >= size && bondedDown(cells, size, pos - size),
    down: bondedDown(cells, size, pos),
    left: pos % size !== 0 && bondedRight(cells, size, pos - 1),
    right: bondedRight(cells, size, pos),
  };
}

/** 從 pos 出發，沿著接合關係找出整個 cluster。單獨一塊就只有它自己。 */
export function connectedCluster(board, pos) {
  const { size } = board;
  const seen = new Set([pos]);
  const stack = [pos];
  while (stack.length) {
    const cur = stack.pop();
    const b = bondsAt(board, cur);
    const nbrs = [];
    if (b.up) nbrs.push(cur - size);
    if (b.down) nbrs.push(cur + size);
    if (b.left) nbrs.push(cur - 1);
    if (b.right) nbrs.push(cur + 1);
    for (const n of nbrs) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

/**
 * 進度 = 已接合的邊數 / 總邊數。
 * 全部接合等價於全部歸位，所以 100% 就是過關。
 */
export function bondProgress(board) {
  const { cells, size } = board;
  let bonded = 0;
  for (let i = 0; i < cells.length; i++) {
    if (bondedRight(cells, size, i)) bonded++;
    if (bondedDown(cells, size, i)) bonded++;
  }
  return { bonded, total: 2 * size * (size - 1) };
}

/**
 * 每一塊（唔係每一格）而家接合咗幾條邊，索引係 pieceId。
 * 回傳 counts[pieceId] = 0..4。
 *
 * ⚠️ 一定要按「塊」數，唔可以按「格」數。
 * 按格數嘅話，將一嚿已經黐好嘅拼圖整嚿搬去另一個位置，嗰幾個新格嘅
 * 接合數就會由 0 升上去，被誤當成「啱啱黐到新嘢」—— 結果玩家一路拖
 * 一嚿砌好咗嘅嘢周圍行，就會一路彈 Excellent。
 * 按塊數就冇呢個問題：整嚿平移，每一塊嘅接合數都完全冇變。
 *
 * （註：接合改成「砌啱位先黐」之後已經冇整嚿平移，但呢個按塊數嘅寫法
 * 一樣啱，而且唔會因為將來再改動作模式而出返個 bug，所以保留。）
 */
export function bondCountsByPiece(board) {
  const counts = new Array(board.cells.length).fill(0);
  board.cells.forEach((pieceId, pos) => {
    const b = bondsAt(board, pos);
    counts[pieceId] = (b.up ? 1 : 0) + (b.down ? 1 : 0) + (b.left ? 1 : 0) + (b.right ? 1 : 0);
  });
  return counts;
}

/* ---------------------------------------------------------------------------
   盤面操作
   --------------------------------------------------------------------------- */

/** 已經砌好嘅盤面（identity）。完成過嘅關卡再入去係睇返完整幅相，唔重新打亂。 */
export function solvedBoard(size) {
  const cells = Array.from({ length: size * size }, (_, i) => i);
  return { size, cells, placed: computePlaced(cells) };
}

export function generateBoard(size) {
  const total = size * size;
  const ids = Array.from({ length: total }, (_, i) => i);
  let cells = shuffle(ids);
  let guard = 0;
  while (isIdentity(cells) && guard < 5) {
    cells = shuffle(ids);
    guard++;
  }
  return { size, cells, placed: computePlaced(cells) };
}

/** 交換任意兩格。已歸位／已接合的格一樣可以拖，沒有任何禁止。 */
export function swapCells(board, i, j) {
  if (i === j) return board;
  const cells = [...board.cells];
  [cells[i], cells[j]] = [cells[j], cells[i]];
  return { ...board, cells, placed: computePlaced(cells) };
}

export function isSolved(board) {
  return board.placed.size === board.size * board.size;
}

/** Position (row, col) for a given board index, 0-indexed. */
export function indexToRowCol(index, size) {
  return { row: Math.floor(index / size), col: index % size };
}

/** 而家棋盤上所有接合，用「邊兩塊」表示（唔係「邊兩格」）。 */
function bondPairs(cells, size) {
  const pairs = new Set();
  for (let i = 0; i < cells.length; i++) {
    if (bondedRight(cells, size, i)) pairs.add(`${cells[i]}-${cells[i + 1]}`);
    if (bondedDown(cells, size, i)) pairs.add(`${cells[i]}-${cells[i + size]}`);
  }
  return pairs;
}

/** 呢個新盤面有冇拆散咗本來黐好嘅嘢？ */
function breaksBond(beforeCells, afterCells, size) {
  const after = bondPairs(afterCells, size);
  for (const pair of bondPairs(beforeCells, size)) {
    if (!after.has(pair)) return true;
  }
  return false;
}

/**
 * 計一次整嚿平移嘅結果；唔合法就回傳 null。
 *
 * 被頂走嘅塊行**鏡像平移**：我哋嗰嚿行 +delta，佢哋整嚿行 −delta。咁樣
 * 佢哋之間嘅相對位置完全冇變，自己黐好咗嘅嘢原封不動咁搬過去。
 *
 * 平移重疊自己嘅情況（例如一條橫三格向右推一格）冇得一步行 −delta，就沿
 * 住 srcOf 一路行返上去直到落喺讓返出嚟嘅格 —— 即係一個循環推移。
 *
 * 最後守多一關：只要有一對本來黐住嘅塊斷開咗就唔算數。剩返嘅係「一嚿嘢
 * 淨係有半邊被頂到」，嗰種點排都一定會拆散，唯有唔畀放。
 */
function tryMoveGroup(board, from, to) {
  if (from === to) return null;
  const group = connectedCluster(board, from);

  const { size } = board;
  const dRow = Math.floor(to / size) - Math.floor(from / size);
  const dCol = (to % size) - (from % size);

  const destOf = new Map();
  for (const cell of group) {
    const row = Math.floor(cell / size) + dRow;
    const col = (cell % size) + dCol;
    if (row < 0 || row >= size || col < 0 || col >= size) return null; // 出界
    destOf.set(cell, row * size + col);
  }

  const srcOf = new Map();
  for (const [src, dst] of destOf) srcOf.set(dst, src);

  const cells = [...board.cells];
  for (const [src, dst] of destOf) cells[dst] = board.cells[src];
  for (const dst of destOf.values()) {
    if (group.has(dst)) continue;
    let landing = dst;
    while (srcOf.has(landing)) landing = srcOf.get(landing);
    cells[landing] = board.cells[dst];
  }

  if (breaksBond(board.cells, cells, size)) return null;
  return { ...board, cells, placed: computePlaced(cells) };
}

/** 呢個盤面仲有冇任何一步行得？ */
function hasLegalMove(board) {
  const n = board.cells.length;
  for (let from = 0; from < n; from++) {
    for (let to = 0; to < n; to++) {
      if (tryMoveGroup(board, from, to)) return true;
    }
  }
  return false;
}

/** 落完之後仲有得郁先至畀行 —— 唔係會行到一個一步都郁唔到嘅死盤面。 */
function safeMove(board, from, to) {
  const next = tryMoveGroup(board, from, to);
  if (!next) return null;
  if (isSolved(next) || hasLegalMove(next)) return next;
  return null;
}

/** 呢步落唔落得？（畀 UI 用嚟決定亮唔亮落點） */
export function canMoveGroup(board, from, to) {
  return safeMove(board, from, to) !== null;
}

export function moveGroup(board, from, to) {
  return safeMove(board, from, to) ?? board;
}

/**
 * 落一步提示。同 moveGroup 嘅分別淨係跳過「唔好封死自己」嗰個檢查 ——
 * 提示係玩家嘅救命掣，次數有限，寧願畀佢行一步差啲嘅，都好過撳完乜都
 * 唔發生。照樣唔會拆散任何嘢（tryMoveGroup 自己守住）。
 */
export function applyHint(board, from, to) {
  return tryMoveGroup(board, from, to) ?? board;
}

/**
 * 揀一步提示。
 *
 * 一嚿黐好咗嘅塊內部一定係啱嘅，所以每一塊嘅「格 − 塊」偏移都係同一個
 * （offset）。即係話成嚿嘢淨係差一個平移就返到屋企。舊版做兩格交換，一
 * 交換就會拆散人哋黐好咗嘅嘢 —— 而家「黐咗唔拆得開」係硬規矩，提示自己
 * 更加唔可以犯規。
 *
 * 排優先次序（唔好撈埋一齊用加權公式，試過會兜圈）：
 *   ① 真係黐到嘢 —— 冇任何一步拆得散接合，所以接合數只升唔跌，即係話
 *      呢種步係永久進度，而接合數有上限，所以一定行得完。
 *   ② 黐唔到就搬一嚿返屋企 —— 歸位格數淨增。
 *   ③ 兩樣都做唔到（互相擋住）先至泊位。
 */
export function findHint(board) {
  const { cells, size } = board;

  /* 逐嚿試「整嚿搬返屋企」。
     ⚠️ 試過再加「搬到同另一嚿 offset 一樣」（＝兩嚿貼埋就會黐）做候選，
     以為可以令提示更加次次都黐到嘢，結果啱啱相反：黐到嘢嘅比例由五成幾
     跌到 8%，每局提示步數由 37 升到 155。原因係接合數只升唔跌、上限得
     咁多，一旦去到「冇一步黐得到」嘅階段，多出嚟嗰堆候選全部係泊位，
     只會令兜圈更長。唔好再加。 */
  const candidates = [];
  const seen = new Set();
  for (let pos = 0; pos < cells.length; pos++) {
    if (seen.has(pos)) continue;
    for (const c of connectedCluster(board, pos)) seen.add(c);
    const delta = pos - cells[pos]; // 成嚿共用同一個 delta
    if (delta === 0) continue;      // 已經喺屋企
    const next = safeMove(board, pos, pos - delta);
    if (next) candidates.push({ from: pos, to: pos - delta, board: next });
  }

  /* 一嚿都搬唔返屋企（互相半嵌住咁擋住）就退到任何一步合法嘅泊位。
     ⚠️ safeMove 係 O(n³)，所以搵夠一批就收手。 */
  if (candidates.length === 0) {
    outer: for (let from = 0; from < cells.length; from++) {
      for (let to = 0; to < cells.length; to++) {
        /* ⚠️ 一定要用 safeMove，唔可以用 tryMoveGroup —— moveGroup 收
           嘅係 safeMove，用鬆啲嗰個會畀出一步 moveGroup 自己拒絕嘅棋，
           玩家撳咗提示但盤面文風不動。 */
        const next = safeMove(board, from, to);
        if (next) {
          candidates.push({ from, to, board: next });
          if (candidates.length >= 12) break outer;
        }
      }
    }
  }
  /* 連一步「唔會封死自己」嘅都搵唔到（實測 4×4 大約 0.6% 局會撞到）。
     呢陣寧願畀一步差啲嘅，都好過個掣撳咗盤面文風不動 —— 玩家會以為隻
     game 壞咗。用 applyHint 落，佢跳過個安全檢查。 */
  if (candidates.length === 0) {
    outer2: for (let from = 0; from < cells.length; from++) {
      for (let to = 0; to < cells.length; to++) {
        const next = tryMoveGroup(board, from, to);
        if (next) {
          candidates.push({ from, to, board: next });
          if (candidates.length >= 12) break outer2;
        }
      }
    }
  }
  if (candidates.length === 0) return null; // 已經砌好

  const beforeBonds = bondPairs(cells, size).size;
  const beforePlaced = board.placed.size;
  const bondGain = (c) => bondPairs(c.board.cells, size).size - beforeBonds;
  const placedGain = (c) => c.board.placed.size - beforePlaced;

  let pool = candidates.filter((c) => bondGain(c) > 0);
  if (pool.length > 0) {
    const best = Math.max(...pool.map(bondGain));
    pool = pool.filter((c) => bondGain(c) === best);
  } else {
    pool = candidates.filter((c) => placedGain(c) > 0);
    if (pool.length === 0) pool = candidates;
  }

  // 打和就隨機，唔好次次都由同一個角落開始
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { from: pick.from, to: pick.to };
}
