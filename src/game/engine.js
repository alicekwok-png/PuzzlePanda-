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

/**
 * 每一塊（唔係每一格）而家接合咗幾條邊，索引係 pieceId。
 * 回傳 counts[pieceId] = 0..4。
 *
 * ⚠️ 一定要按「塊」數，唔可以按「格」數。
 * 按格數嘅話，將一嚿已經黐好嘅拼圖整嚿搬去另一個位置，嗰幾個新格嘅
 * 接合數就會由 0 升上去，被誤當成「啱啱黐到新嘢」—— 結果玩家一路拖
 * 一嚿砌好咗嘅嘢周圍行，就會一路彈 Excellent。
 * 按塊數就冇呢個問題：整嚿平移，每一塊嘅接合數都完全冇變。
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
 * 提示 = 直接幫玩家黐埋，唔係淨係著燈。
 *
 * ⚠️ 呢個係整個提示功能嘅重點，改之前睇清楚。
 *
 * 做法：每一次都揀一塊擺返佢自己嗰格，而且揀「擺落去即刻黐到最多邊」
 * 嗰一塊。所以正確嗰一嚿會由一個起點一路向外生 —— 每撳一次都見到有
 * 嘢黐埋，唔係淨係郁咗一格。
 *
 * 點解唔揀「淨賺最多接合」嗰步（喺任何位置砌起一嚿都計）：嗰種揀法
 * 唔保證會收斂。喺棋盤中間砌起一嚿擺錯位嘅雲團一樣可以賺好多接合，
 * 跟住又要拆返佢，一路撳會兜圈。而家用「已歸位格數」做推進指標，佢
 * 每一步都嚴格加至少一格，所以最多 N² 步一定砌完。
 *
 * 唯一一次唔會黐到嘢係開局第一撳（成盤都未有一格啱，冇嘢可以黐）。
 * 之後每一撳都必定至少黐到一條邊 —— 只要仲有未砌好嘅格，正確嗰嚿嘅
 * 邊界就一定有隔籬位可以填。
 *
 * 回傳 { from, to }：from = 嗰塊而家喺邊，to = 佢應該去邊（= 佢嘅 id）。
 */
export function findHint(board) {
  const { cells, size } = board;

  const posOf = new Array(cells.length);
  cells.forEach((pieceId, pos) => {
    posOf[pieceId] = pos;
  });

  let best = -1;
  let pool = [];

  for (let pos = 0; pos < cells.length; pos++) {
    if (cells[pos] === pos) continue; // 已經喺正確位置
    const from = posOf[pos];
    const next = [...cells];
    [next[pos], next[from]] = [next[from], next[pos]];

    const b = bondsAt({ cells: next, size }, pos);
    const gained = (b.up ? 1 : 0) + (b.down ? 1 : 0) + (b.left ? 1 : 0) + (b.right ? 1 : 0);

    if (gained > best) {
      best = gained;
      pool = [{ from, to: pos }];
    } else if (gained === best) {
      pool.push({ from, to: pos });
    }
  }

  if (pool.length === 0) return null; // 已經砌好
  // 打和就隨機，唔好次次都由同一個角落開始
  return pool[Math.floor(Math.random() * pool.length)];
}
