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

/* ── 點解係「砌啱位先黐」而唔係「相對啱就黐」──────────────────────
   舊版係相對接合：兩塊喺棋盤上撠住、喺原圖又係鄰居，就當黐咗。咁樣可以
   喺棋盤中間隨處砌起一嚿，再成嚿搬去啱嘅位。

   但 Alice 要求「黐咗就永遠拆唔開」。喺相對接合底下呢個要求同「棋盤填
   滿冇空位」正面衝突：你放一塊落去一定要頂走另一塊，而砌到一半之後你郁
   邊度都會壓到人哋一嚿嘅半邊 —— 實測接合去到 50% 之後，得返 3.6% 嘅拖
   曳仲放得落，提示真正黐到嘢嘅比例由 94% 跌到 9%。

   改成絕對接合就一次過解決：黐咗＝已經喺自己屋企，根本冇理由再郁佢。
   「唔拆得開」變成免費，而且散片之間永遠換得，所以永遠有得郁、永遠砌得
   完 —— 唔使靠任何死局檢查。 */

/** 第 i 格與它右邊那格是否接合（兩邊都要已經歸位）。 */
export function bondedRight(cells, size, i) {
  if (i % size === size - 1) return false; // 棋盤上已經在最右一列
  return cells[i] === i && cells[i + 1] === i + 1;
}

/** 第 i 格與它下面那格是否接合（兩邊都要已經歸位）。 */
export function bondedDown(cells, size, i) {
  if (Math.floor(i / size) === size - 1) return false;
  return cells[i] === i && cells[i + size] === i + size;
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

/**
 * 拖一塊去另一格。
 *
 * 規矩好簡單：**已經歸位（黐咗）嘅格唔郁得，亦都唔會被人頂走。** 兩邊
 * 都係未歸位嘅散片先至交換得。
 *
 * 因為咁：
 *  - 黐咗嘅嘢永遠拆唔散 —— 佢哋根本冇任何一步郁得到。
 *  - 永遠唔會卡死 —— 只要未砌完就一定有兩格未歸位，而兩格散片之間永遠
 *    交換得。唔使好似相對接合嗰陣咁做死局檢查。
 */
export function moveGroup(board, from, to) {
  return canMoveGroup(board, from, to) ? swapCells(board, from, to) : board;
}

/** 呢步落唔落得？（畀 UI 用嚟決定亮唔亮落點） */
export function canMoveGroup(board, from, to) {
  if (from === to) return false;
  if (from == null || to == null) return false;
  return !board.placed.has(from) && !board.placed.has(to);
}

/**
 * 揀一步提示：攞一塊散片，直接放返佢自己屋企。
 *
 * ── 點解一定搵到 ────────────────────────────────────────────────
 * 塊 v 而家企喺格 p（p ≠ v）。咁格 v 入面一定唔係塊 v（塊 v 喺 p 度），
 * 即係格 v 一定未歸位 —— 所以「將 v 搬返格 v」呢步永遠合法。未砌完就一
 * 定有提示畀你，唔會出現撳咗個掣乜都唔發生。
 *
 * ── 點揀邊塊 ───────────────────────────────────────────────────
 * 揀「放落去即刻同隔籬黐埋」嗰啲。玩家撳提示係想見到兩塊真係癡埋一齊，
 * 唔係一塊靜靜哋跳咗去一個睇落一樣嘅位（Alice 早就定咗呢條）。
 */
export function findHint(board) {
  const { cells, size } = board;

  let best = -1;
  let pool = [];

  for (let home = 0; home < cells.length; home++) {
    if (cells[home] === home) continue; // 已經歸位
    const from = cells.indexOf(home);   // 塊 home 而家企喺邊
    if (from < 0) continue;

    const next = [...cells];
    [next[home], next[from]] = [next[from], next[home]];

    const b = bondsAt({ cells: next, size }, home);
    const gained = (b.up ? 1 : 0) + (b.down ? 1 : 0) + (b.left ? 1 : 0) + (b.right ? 1 : 0);

    if (gained > best) {
      best = gained;
      pool = [{ from, to: home }];
    } else if (gained === best) {
      pool.push({ from, to: home });
    }
  }

  if (pool.length === 0) return null; // 已經砌好
  // 打和就隨機，唔好次次都由同一個角落開始
  return pool[Math.floor(Math.random() * pool.length)];
}
