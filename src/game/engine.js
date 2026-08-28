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

/** 第 i 格與它右邊那格是否接合。 */
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

/** 每格目前接合了幾條邊 —— 用來找出「這一步新接合了哪幾格」。 */
export function bondCounts(board) {
  return board.cells.map((_, pos) => {
    const b = bondsAt(board, pos);
    return (b.up ? 1 : 0) + (b.down ? 1 : 0) + (b.left ? 1 : 0) + (b.right ? 1 : 0);
  });
}

/* ---------------------------------------------------------------------------
   盤面操作
   --------------------------------------------------------------------------- */

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

/**
 * 整嚿平移。拖動任何一格，會把它所屬的整個 cluster 一起搬走。
 *
 * - 位移量由 from → to 決定，整嚿剛性平移，形狀不變。
 * - 任何一格會被推出邊界就整個動作取消（回傳原本的 board）。
 * - 目的地原本的格被擠出來，填回這嚿騰空的位置。
 * - 因為接合是相對關係，平移之後 cluster 內部的接合完全保留。
 */
export function moveGroup(board, from, to) {
  if (from === to) return board;
  const group = connectedCluster(board, from);

  const { size } = board;
  const dRow = Math.floor(to / size) - Math.floor(from / size);
  const dCol = (to % size) - (from % size);

  const destOf = new Map();
  for (const cell of group) {
    const row = Math.floor(cell / size) + dRow;
    const col = (cell % size) + dCol;
    if (row < 0 || row >= size || col < 0 || col >= size) return board; // 出界，整嚿不動
    destOf.set(cell, row * size + col);
  }

  const destSet = new Set(destOf.values());
  const cells = [...board.cells];
  const displaced = [...destSet].filter((d) => !group.has(d)).sort((a, b) => a - b).map((d) => board.cells[d]);
  const vacated = [...group].filter((g) => !destSet.has(g)).sort((a, b) => a - b);

  for (const [src, dst] of destOf) cells[dst] = board.cells[src];
  vacated.forEach((cell, i) => {
    cells[cell] = displaced[i];
  });

  return { ...board, cells, placed: computePlaced(cells) };
}

/**
 * 提示：找一塊還沒完全接合的，回傳它現在的位置與它應該去的位置。
 * 優先挑「接合邊數最少」的，這樣提示才會用在最零散的那些塊上。
 */
export function findHint(board) {
  const counts = bondCounts(board);
  const candidates = board.cells
    .map((pieceId, pos) => ({ pos, pieceId, bonds: counts[pos] }))
    .filter(({ pos, pieceId }) => pos !== pieceId);
  if (candidates.length === 0) return null;
  const min = Math.min(...candidates.map((c) => c.bonds));
  const pool = candidates.filter((c) => c.bonds === min);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { from: pick.pos, to: pick.pieceId };
}
