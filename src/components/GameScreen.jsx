import { useEffect, useRef, useState } from 'react';
import {
  bondCounts,
  bondProgress,
  bondsAt,
  computePlaced,
  connectedCluster,
  findHint,
  generateBoard,
  isSolved,
  moveGroup,
  swapCells,
} from '../game/engine';
import { loadProgress, markLevelComplete } from '../game/storage';
import { useT } from '../i18n/context';
import { showInterstitialOnLevelWin, showRewarded } from '../services/ads';
import { feedback, preloadSfx } from '../services/feedback';
import { CHAPTERS, LEVELS } from '../game/levels';
import AdSlot from './AdSlot';
import ChapterTransition from './ChapterTransition';
import PuzzlePiece from './PuzzlePiece';
import WinModal from './WinModal';

const MAX_HISTORY = 30;
/* 存 key 不存文字 —— 連擊字樣要能跟著語言切換 */
const COMBO_TIER_KEYS = ['game.comboTier1', 'game.comboTier2', 'game.comboTier3'];
/** 拖曳判定死區：手指微抖不該被當成一次拖曳。 */
const DRAG_DEADZONE_PX = 12;

export default function GameScreen({ level, totalLevels, onExit, onNextLevel }) {
  const [board, setBoard] = useState(() => generateBoard(level.size));
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(level.hints);
  const [won, setWon] = useState(false);
  const [draggingPos, setDraggingPos] = useState(null);
  /* 拖住嗰一嚿。connectedCluster 一定包含起點自己，所以散片 = size 1、
     砌起咗嘅一嚿 = size > 1。冇「空集合」呢種情況。 */
  const [dragGroup, setDragGroup] = useState(() => new Set());
  const [dropCells, setDropCells] = useState(() => new Set());
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [combo, setCombo] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [justBonded, setJustBonded] = useState(() => new Set());
  const [peeking, setPeeking] = useState(false);
  const [peeksLeft, setPeeksLeft] = useState(level.peeks);
  const [bestMoves, setBestMoves] = useState(null);
  /* 完成整章第 5 關（首次）才會設值，設咗就先播過渡片再入結算 */
  const [chapterDone, setChapterDone] = useState(null);
  const t = useT();

  const boardRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const passedDeadzoneRef = useRef(false);
  const feedbackTimerRef = useRef(null);
  const justBondedTimerRef = useRef(null);

  // 橫幅由 App 依畫面統一開關（遊戲頁與關卡頁都已用 AdSlot 預留高度），
  // 這裡只負責清掉自己的計時器。
  useEffect(() => {
    preloadSfx();
    return () => {
      clearTimeout(feedbackTimerRef.current);
      clearTimeout(justBondedTimerRef.current);
    };
  }, []);

  function resetLevel() {
    setBoard(generateBoard(level.size));
    setHistory([]);
    setMoves(0);
    setHintsLeft(level.hints);
    setPeeksLeft(level.peeks);
    setPeeking(false);
    setWon(false);
    setDraggingPos(null);
    setDragGroup(new Set());
    setDropCells(new Set());
    setOffset({ x: 0, y: 0 });
    setCombo(0);
    setFeedbackMsg(null);
    setJustBonded(new Set());
    setChapterDone(null);
  }

  function pushHistory(currentBoard) {
    setHistory((h) => [...h, [...currentBoard.cells]].slice(-MAX_HISTORY));
  }

  function handleUndo() {
    if (history.length === 0 || won) return;
    feedback.undo();
    const prevCells = history[history.length - 1];
    setBoard({ size: level.size, cells: prevCells, placed: computePlaced(prevCells) });
    setHistory((h) => h.slice(0, -1));
  }

  /** 由畫面座標換算棋盤格 index。所有輸入都先轉成格座標，邏輯不碰像素。 */
  function posFromClient(clientX, clientY) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.min(board.size - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * board.size)));
    const row = Math.min(board.size - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * board.size)));
    return row * board.size + col;
  }

  function handlePointerDown(e, position) {
    // 睇圖 overlay 顯示中就完全不接受棋盤操作（例如另一隻手指同時拖）
    if (won || peeking) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    passedDeadzoneRef.current = false;
    setDraggingPos(position);
    setDragGroup(connectedCluster(board, position));
    setDropCells(new Set());
    setOffset({ x: 0, y: 0 });
    feedback.pickUp();
  }

  function handlePointerMove(e) {
    if (draggingPos == null) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!passedDeadzoneRef.current) {
      if (Math.hypot(dx, dy) < DRAG_DEADZONE_PX) return;
      passedDeadzoneRef.current = true;
    }

    setOffset({ x: dx, y: dy });
    // 已歸位的格子一樣是合法落點 —— 不再排除它們
    setDropCells(previewDestination(posFromClient(e.clientX, e.clientY)));
  }

  /** 預覽這一嚿會落在哪幾格；出界就回傳空集合（一格都唔亮）。 */
  function previewDestination(target) {
    if (target == null || dragGroup.size === 0) return new Set();
    const size = board.size;
    const dRow = Math.floor(target / size) - Math.floor(draggingPos / size);
    const dCol = (target % size) - (draggingPos % size);
    const dest = new Set();
    for (const cell of dragGroup) {
      const row = Math.floor(cell / size) + dRow;
      const col = (cell % size) + dCol;
      if (row < 0 || row >= size || col < 0 || col >= size) return new Set(); // 出界
      dest.add(row * size + col);
    }
    return dest;
  }

  function handlePointerUp(e) {
    if (draggingPos == null) return;
    const sourcePos = draggingPos;
    setDraggingPos(null);
    setDragGroup(new Set());
    setDropCells(new Set());
    setOffset({ x: 0, y: 0 });

    const targetPos = posFromClient(e.clientX, e.clientY);
    if (targetPos == null || targetPos === sourcePos) return;

    /* 一律走 moveGroup —— 單一散片就係一個 size 1 嘅 cluster，平移佢
       同兩格交換完全等價，唔使再分兩條路。
       任何兩格都可以交換，包括已歸位的 —— 冇「被拒絕」這回事。 */
    const newBoard = moveGroup(board, sourcePos, targetPos);

    if (newBoard === board) {
      return; // 整組平移會出界，動作取消（素材沒有對應的失敗音效）
    }

    commitBoard(newBoard);
  }

  /**
   * 落子後的統一處理：存歷史、記步數、判斷有沒有新歸位，然後放特效與音效。
   * 手動拖曳與「提示」都走這裡，所以兩邊的回饋完全一致。
   */
  function commitBoard(newBoard) {
    pushHistory(board);
    setBoard(newBoard);
    setMoves((m) => m + 1);

    /* 回饋看的是「有沒有新接合」，不是「有沒有絕對歸位」——
       玩家在任何位置砌起一嚿都應該即刻有反應。 */
    const beforeCounts = bondCounts(board);
    const afterCounts = bondCounts(newBoard);
    const newlyBonded = afterCounts
      .map((c, i) => (c > beforeCounts[i] ? i : -1))
      .filter((i) => i >= 0);

    if (newlyBonded.length > 0) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      flashJustBonded(newlyBonded);
      feedback.lock(nextCombo);
      const tier = Math.min(nextCombo, COMBO_TIER_KEYS.length);
      showFeedback(COMBO_TIER_KEYS[tier - 1], nextCombo);
    } else {
      setCombo(0);
      feedback.swap(); // 交換成功但沒歸位 —— 跟 lock 是兩個不同的聲
    }

    if (isSolved(newBoard)) {
      feedback.levelClear();

      /* 先讀舊進度再寫，才分得出「首次完成」與「重玩」。
         重玩已完成的第 5 關不應該再觸發章節過渡 —— 這個判斷本身就處理了
         idempotency，不需要額外的「播過未」storage flag。 */
      const before = loadProgress();
      const wasCompleted = !!before.completed[level.id];
      const progress = markLevelComplete(level.id, moves + 1, totalLevels);
      setBestMoves(progress.bestMoves[level.id] ?? null);

      const chapterLevelIds = LEVELS.filter((l) => l.chapterId === level.chapterId).map((l) => l.id);
      const completedAfter = chapterLevelIds.filter((id) => progress.completed[id]).length;
      const justCompletedChapter = !wasCompleted && completedAfter === chapterLevelIds.length;

      if (justCompletedChapter) {
        setChapterDone(CHAPTERS.find((c) => c.id === level.chapterId) ?? null);
      }
      setTimeout(() => setWon(true), 420);
    }
  }

  /* 插頁廣告放在「離開結算畫面」而不是「一過關就彈」——玩家先看到自己
     完成的照片，再進廣告，留存明顯較好。要改回過關即彈，把這裡的呼叫
     搬到 WinModal 掛載時即可。頻率上限在 ads.js 的 AD_POLICY。 */
  async function leaveWin(action) {
    await showInterstitialOnLevelWin();
    action();
  }

  /** 剛剛新接合的格加一次性閃光，動畫跑完就移除 class。 */
  function flashJustBonded(positions) {
    setJustBonded(new Set(positions));
    clearTimeout(justBondedTimerRef.current);
    justBondedTimerRef.current = setTimeout(() => setJustBonded(new Set()), 800);
  }

  function showFeedback(tierKey, comboCount) {
    clearTimeout(feedbackTimerRef.current);
    setFeedbackMsg({ tierKey, comboCount, key: Date.now() });
    feedbackTimerRef.current = setTimeout(() => setFeedbackMsg(null), 1400);
  }

  /* 提示 = 直接幫玩家把一塊搬回正確位置，不是只把它照亮。
     跟參考 App 一致：撳落去進度就會跳，並且吃到完整的歸位特效。 */
  function handleHint() {
    if (hintsLeft <= 0 || won) return;
    const found = findHint(board);
    if (!found) return;
    setHintsLeft((h) => h - 1);
    feedback.hint();
    commitBoard(swapCells(board, found.from, found.to));
  }

  /* 睇圖（peek）：撳住即顯示完整原圖，一鬆手即收。
     不是 tap 開 / 再 tap 收的 toggle，也沒有自動計時。
     每一次「撳落 → 鬆手」算 1 次，不論中間按住多久。 */
  function handlePeekStart() {
    if (peeksLeft <= 0 || won || peeking) return;
    setPeeksLeft((n) => n - 1);
    setPeeking(true);
    feedback.peekOpen();
  }

  function handlePeekEnd() {
    if (!peeking) return;
    setPeeking(false);
    feedback.peekClose();
  }

  /** 提示用完時，讓玩家看一支獎勵式廣告換一次提示。 */
  async function handleEarnHint() {
    const watched = await showRewarded('extra-hint');
    if (watched) setHintsLeft((h) => h + 1);
  }

  const { bonded, total: totalBonds } = bondProgress(board);
  const progressPct = totalBonds === 0 ? 0 : Math.round((bonded / totalBonds) * 100);

  return (
    <div className="screen game-screen" style={{ '--level-bg': level.theme.background }}>
      <div className="ambient" />

      <div className="top-bar">
        <button className="icon-btn" onClick={onExit} aria-label={t('nav.backToLevelSelect')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">
          <span className="level-kicker">
            {t('game.levelKicker', { n: level.id, size: board.size })}
          </span>
          {t(`chapters.${level.chapterKey}`)}
        </div>
        <div className="top-bar-actions">
          <button
            className="icon-btn"
            onClick={handleUndo}
            disabled={history.length === 0}
            aria-label={t('game.undo')}
          >
            <img src="/icons/undo.png" alt="" />
          </button>

          {/* 仲有次數就著金色 —— 設計用顏色分「有得用 / 用晒」，
              比單靠數字徽章一眼睇得清 */}
          <button
            className={`icon-btn${hintsLeft > 0 ? ' is-armed' : ''}`}
            onClick={handleHint}
            disabled={hintsLeft <= 0}
            aria-label={t('game.hint')}
          >
            <img src="/icons/hint.png" alt="" />
            <span className="icon-btn-badge">{hintsLeft}</span>
          </button>

          {/* 睇圖：撳住先顯示，鬆手即收 —— 不是 toggle */}
          <button
            className="icon-btn"
            onPointerDown={handlePeekStart}
            onPointerUp={handlePeekEnd}
            onPointerLeave={handlePeekEnd}
            onPointerCancel={handlePeekEnd}
            disabled={peeksLeft <= 0}
            aria-label={t('game.peekAria')}
          >
            <img src="/icons/peek.png" alt="" />
            <span className="icon-btn-badge is-peek">{peeksLeft}</span>
          </button>
        </div>
      </div>

      <div className="progress-row">
        <div
          className="progress-bar-track"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('game.progressAria')}
        >
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          <span className="progress-tick" />
          {/* 星星旋鈕騎喺填充嘅前端跟住行。左右各收 12px（旋鈕半徑），
              否則 0% 同 100% 嗰陣粒星會凸出軌道外面壓住旁邊嘅藥丸。 */}
          <span
            className="progress-knob"
            style={{ left: `calc(12px + (100% - 24px) * ${progressPct} / 100)` }}
          >
            ⭐
          </span>
        </div>
        <div className="progress-counts">
          <p className="progress-label">
            <b>{bonded}</b>/{totalBonds}
          </p>
          <p className="progress-moves">
            {t('game.movesReadout')} <b>{moves}</b>
          </p>
          {/* 重新開始搬上嚟同兩粒藥丸排埋一行 —— 底部成條工具列因此可以
              收起，慳返嗰 47px 全部俾棋盤。 */}
          <button type="button" className="restart-chip" onClick={resetLevel}>
            <span aria-hidden="true">⟲</span>
            {t('game.restart')}
          </button>
        </div>
      </div>

      <div className={`game-body${hintsLeft <= 0 ? ' has-dock' : ''}`}>
        <div className="board-wrap">
          {feedbackMsg && (
            <div className="feedback-badge" key={feedbackMsg.key}>
              {t(feedbackMsg.tierKey)}
              {feedbackMsg.comboCount > 1 && <span className="feedback-combo">×{feedbackMsg.comboCount}</span>}
            </div>
          )}
          <div className="board-mat">
            <div
              className="board"
              ref={boardRef}
              style={{
                gridTemplateColumns: `repeat(${board.size}, 1fr)`,
                gridTemplateRows: `repeat(${board.size}, 1fr)`,
              }}
            >
              {board.cells.map((pieceId, position) => (
                <PuzzlePiece
                  key={pieceId}
                  pieceId={pieceId}
                  position={position}
                  size={board.size}
                  background={level.theme.background}
                  placed={board.placed.has(position)}
                  bonds={bondsAt(board, position)}
                  justBonded={justBonded.has(position)}
                  /* 散片 = 拎起嚟嘅姿態（放大 + 傾側）；
                     砌起咗嘅一嚿 = 輕微抬起，讀起來像一整塊而唔係一堆碎片。 */
                  dragging={draggingPos === position && dragGroup.size <= 1}
                  groupDragging={dragGroup.size > 1 && dragGroup.has(position)}
                  /* 只認整嚿嘅落點：會出界就一格都唔亮，
                     免得單格高亮令玩家以為放得低。 */
                  dropTarget={dropCells.has(position)}
                  offset={offset}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 提示用晒先出現。平時完全唔 render，唔好長期霸住棋盤嘅高度 ——
            undo / hint / peek 喺頂欄，重新開始喺進度列。 */}
        {hintsLeft <= 0 && (
          <div className="game-foot">
            <div className="tool-dock">
              <button className="tool-btn" onClick={handleEarnHint}>
                <span className="glyph">🎬</span>
                <span className="label">{t('game.watchAdForHint')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 廣告版位：遊戲畫面底部橫幅 */}
      <AdSlot id="game-bottom-banner" format="banner" label={t('ads.bannerSlot')} />

      {peeking && (
        <div className="peek-overlay">
          <div className="peek-frame" style={{ backgroundImage: level.theme.background }} />
          <span className="peek-hint">{t('game.peekHint')}</span>
        </div>
      )}

      {/* 章節過渡是「大時刻」，蓋在結算之上先播；撳繼續之後才見到 WinModal，
          兩者都會出現，不會漏掉其中一個。 */}
      {chapterDone && <ChapterTransition chapter={chapterDone} onContinue={() => setChapterDone(null)} />}

      {won && !chapterDone && (
        <WinModal
          level={level}
          moves={moves}
          bestMoves={bestMoves}
          hasNext={level.id < totalLevels}
          onNext={() => leaveWin(onNextLevel)}
          onReplay={() => leaveWin(resetLevel)}
          onExit={() => leaveWin(onExit)}
        />
      )}
    </div>
  );
}
