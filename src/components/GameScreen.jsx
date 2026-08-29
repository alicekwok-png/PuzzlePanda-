import { useEffect, useRef, useState } from 'react';
import {
  bondCountsByPiece,
  bondProgress,
  bondsAt,
  computePlaced,
  connectedCluster,
  canMoveGroup,
  findHint,
  generateBoard,
  isSolved,
  moveGroup,
  solvedBoard,
} from '../game/engine';
import { claimDailyMission, consumeBonusHints, loadProgress, markLevelComplete } from '../game/storage';
import { ensureTodayMission, isMissionSatisfied, isUnlocked } from '../game/dailyMission';
import { useT } from '../i18n/context';
import { hideBanner, showBanner, showInterstitialOnLevelWin, showRewarded } from '../services/ads';
import { isDevBuild } from '../services/devMode';
import { feedback, preloadSfx } from '../services/feedback';
import { CHAPTERS, LEVELS } from '../game/levels';
import AdSlot from './AdSlot';
import AlbumScreen from './AlbumScreen';
import Icon from './Icon';
import ChapterTransition from './ChapterTransition';
import PuzzlePiece from './PuzzlePiece';
import WinModal from './WinModal';

/* 存 key 不存文字 —— 連擊字樣要能跟著語言切換 */
const COMBO_TIER_KEYS = ['game.comboTier1', 'game.comboTier2', 'game.comboTier3'];
/** 拖曳判定死區：手指微抖不該被當成一次拖曳。 */
const DRAG_DEADZONE_PX = 12;

/* 進度條上面嘅里程碑。每個百分比對應 public/icons/milestone-<pct>.webp。
   未行到就灰灰哋，行到就著返色同彈一下。

   敘事排序（見 design/ui-design-system-spec.md §5b）：
     25 綁頭帶擰拳     progress-panda-1  專注／準備開始
     50 雙手舉高歡呼   progress-panda-2  開心／中段鼓勵
     75 跳躍踢腳       progress-panda-3  興奮／就嚟到喇
   原圖喺 design/icons/，用 scripts/prepare_icons.py 處理成
   public/icons/milestone-<pct>.webp。
   要加減里程碑就改呢個陣列，同埋跑多次個 script 落多幾張圖。 */
const MILESTONES = [25, 50, 75];

export default function GameScreen({ level, totalLevels, onExit, onNextLevel }) {
  /* 完成過嘅關卡再入嚟，唔會重新打亂 —— 直接見返完整幅相，想玩先撳重玩。
     GameScreen 喺 App 度用 level.id 做 key，換關會重新 mount，所以入嚟
     讀一次就夠。 */
  const [initiallyDone] = useState(() => !!loadProgress().completed[level.id]);
  const [reviewing, setReviewing] = useState(initiallyDone);
  const [board, setBoard] = useState(() =>
    initiallyDone ? solvedBoard(level.size) : generateBoard(level.size),
  );
  const [moves, setMoves] = useState(0);
  /* 做完每日任務攞到嘅額外提示，開關嗰陣一次過加落嚟然後清零（用完即銷）。
     ⚠️ 淨係喺真係要玩嗰陣先攞。入去睇返完整幅相唔應該食咗人哋個獎勵
     —— 佢乜都未玩過。撳重玩先至 consume（見 startPlaying）。
     ⚠️ 用 useState 嘅 initialiser 而唔係 useEffect —— useEffect 喺 React
     StrictMode 開發模式會行兩次，bonus 就會俾人食咗兩次。 */
  const [bonusHints, setBonusHints] = useState(() => (initiallyDone ? 0 : consumeBonusHints()));
  const [hintsLeft, setHintsLeft] = useState(() => level.hints + bonusHints);
  /* 每日任務「零提示過關」要知呢一鋪用咗幾多次 —— 唔可以由 hintsLeft 倒推，
     因為初始值會俾 bonus 加大咗。 */
  const [hintsUsed, setHintsUsed] = useState(0);
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
  /* 砌完嗰一下嘅特效：棋盤變白框 + 星點，停一停先彈結算畫面。
     唔即刻彈 —— 玩家要見到自己砌好嗰幅完整嘅相。 */
  const [solvedFlash, setSolvedFlash] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [peeksLeft, setPeeksLeft] = useState(level.peeks);
  const [bestMoves, setBestMoves] = useState(null);
  /* 貼紙簿喺呢度做 overlay，唔行 App 嘅 setScreen('album')。
     行 setScreen 會令成個 GameScreen unmount，board / moves /
     hintsLeft 全部跌晒，返嚟個關卡就變咗重新開始。
     非 null 即係開緊 —— 順便當 snapshot，每次撳開都讀返最新進度。 */
  const [albumProgress, setAlbumProgress] = useState(null);
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

  /** 由「睇返完整幅相」轉去真係玩。呢一刻先攞 bonus hint。 */
  function startPlaying() {
    feedback.tap();
    const bonus = consumeBonusHints();
    setBonusHints(bonus);
    setReviewing(false);
    resetLevel(bonus);
  }

  /** @param bonus 開新一鋪要加幾多 bonus hint。「重新開始」傳 undefined
   *  —— 開關嗰陣攞過嘅唔會再攞多次。 */
  function resetLevel(bonus = bonusHints) {
    setBoard(generateBoard(level.size));
    setMoves(0);
    setHintsLeft(level.hints + bonus);
    setHintsUsed(0);
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
    setSolvedFlash(false);
    setChapterDone(null);
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
    /* 已經黐咗嘅塊唔郁得 —— 黐咗即係已經喺自己屋企，冇理由再搬。
       喺呢度就攔住，唔好等到放手先拒絕：手指一撳落去冇反應，玩家即刻
       知呢啲係鎖死咗嘅，唔使估。 */
    if (board.placed.has(position)) return;
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

  /**
   * 預覽這一嚿會落在哪幾格；出界或者放唔落就回傳空集合（一格都唔亮）。
   *
   * 「放唔落」＝呢步會拆散人哋已經黐好咗嘅嘢。唔亮落點就係話畀玩家聽
   * 呢度放唔得 —— 唔使另外出錯誤訊息。
   */
  function previewDestination(target) {
    if (target == null || dragGroup.size === 0) return new Set();
    if (!canMoveGroup(board, draggingPos, target)) return new Set();
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
   * 落子後的統一處理：記步數、判斷有沒有新歸位，然後放特效與音效。
   * 手動拖曳與「提示」都走這裡，所以兩邊的回饋完全一致。
   */
  function commitBoard(newBoard) {
    setBoard(newBoard);
    setMoves((m) => m + 1);

    /* 回饋睇嘅係「有冇新接合」，唔係「有冇絕對歸位」——
       玩家喺任何位置砌起一嚿都應該即刻有反應。

       ⚠️ 一定要按「塊」數接合，唔可以按「格」數（見 bondCountsByPiece）。
       按格數嘅話，拖一嚿已經黐好嘅嘢周圍行都會一路彈 Excellent。 */
    const beforeCounts = bondCountsByPiece(board);
    const afterCounts = bondCountsByPiece(newBoard);
    const newlyBondedPieces = afterCounts
      .map((c, pieceId) => (c > beforeCounts[pieceId] ? pieceId : -1))
      .filter((id) => id >= 0);
    // 閃光要打喺格上面，所以由塊反查佢而家喺邊格
    const newlyBonded = newlyBondedPieces.map((pieceId) => newBoard.cells.indexOf(pieceId));

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
      setSolvedFlash(true);

      /* 先讀舊進度再寫，才分得出「首次完成」與「重玩」。
         重玩已完成的第 5 關不應該再觸發章節過渡 —— 這個判斷本身就處理了
         idempotency，不需要額外的「播過未」storage flag。 */
      const before = loadProgress();
      const wasCompleted = !!before.completed[level.id];
      const previousBest = before.bestMoves[level.id] ?? null;
      const progress = markLevelComplete(level.id, moves + 1, totalLevels);
      setBestMoves(progress.bestMoves[level.id] ?? null);

      /* 每日任務：喺呢度判斷，因為只有呢度先同時知道「用咗幾多提示」、
         「用咗幾多步」同「之前嘅最佳步數」。
         ⚠️ 要用 markLevelComplete 之前嗰個 previousBest —— 佢已經把
         今鋪嘅成績寫咗入去，之後再讀就永遠贏唔到自己。 */
      if (isUnlocked(progress)) {
        const mission = ensureTodayMission(progress);
        if (isMissionSatisfied(mission, { hintsUsed, moves: moves + 1, previousBest })) {
          claimDailyMission();
        }
      }

      const chapterLevelIds = LEVELS.filter((l) => l.chapterId === level.chapterId).map((l) => l.id);
      const completedAfter = chapterLevelIds.filter((id) => progress.completed[id]).length;
      const justCompletedChapter = !wasCompleted && completedAfter === chapterLevelIds.length;

      if (justCompletedChapter) {
        setChapterDone(CHAPTERS.find((c) => c.id === level.chapterId) ?? null);
      }
      /* 1.15s = boardComplete 動畫嘅長度（見 index.css）。
         兩邊要夾住，太早彈就會斬斷特效，太遲玩家會等。 */
      setTimeout(() => setWon(true), 1150);
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
    setHintsUsed((n) => n + 1);
    feedback.hint();
    /* ⚠️ 一定要行 moveGroup，唔可以行 swapCells：提示搬嘅係成嚿黐好咗
       嘅嘢，兩格交換會將佢拆散 —— 正正犯咗「黐咗唔拆得開」條規矩。 */
    commitBoard(moveGroup(board, found.from, found.to));
  }

  /* ⚠️ 收 peek 嘅保險：只要 peeking 係 true，就喺 window 度聽鬆手。
     單靠粒掣自己嗰個 onPointerUp 係唔夠嘅 ——
     1. 撳落去嗰下 peeksLeft 會減到 0，粒掣即刻變 disabled，
        而 disabled 嘅掣喺真機上唔會再收到任何 pointer 事件，
        「鬆手」永遠傳唔到，overlay 就卡死收唔返（實機報障就係咁）；
     2. 手指滑出咗粒掣範圍外面先鬆手；
     3. 中途切走 App／來電，系統直接取消個 pointer。
     overlay 卡住嘅話成個遊戲會廢咗 —— 棋盤喺 peeking 期間係唔收操作嘅。

     故意唔寫依賴陣列：每 render 重新掛一次，handlePeekEnd 就永遠係新嗰個，
     唔會捉到舊 closure。掛／拆四個 listener 好平，唔值得為咗慳呢啲而
     引入 stale closure 嘅風險。 */
  useEffect(() => {
    if (!peeking) return undefined;
    const end = () => handlePeekEnd();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    document.addEventListener('visibilitychange', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
      document.removeEventListener('visibilitychange', end);
    };
  });

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

  /* 開發者用：一鍵砌好，用嚟睇過關特效同結算畫面，唔使真係玩完一關。
     同首頁嗰條開發者列一樣，只在 dev build / ?dev=1 出現。
     行嘅係同一條 commitBoard，所以特效、音效、存檔、章節過渡全部照跑。 */
  function devSolve() {
    if (won) return;
    const cells = Array.from({ length: level.size * level.size }, (_, i) => i);
    commitBoard({ size: level.size, cells, placed: computePlaced(cells) });
  }

  function openAlbum() {
    feedback.tap();
    /* 原生橫幅係浮喺 WebView 上面嘅 native view，唔會俾 overlay 蓋住，
       所以要自己收起。App 嗰個 effect 只喺 screen 改變時行，唔會同呢度打交。 */
    hideBanner();
    setAlbumProgress(loadProgress());
  }

  function closeAlbum() {
    setAlbumProgress(null);
    showBanner();
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
          <img src="/icons/back.webp" alt="" />
        </button>
        {/* 關卡名／格數／交換次數全部拎走 —— 玩緊嗰陣唔需要，過關結算
            度全部都有。進度條喺頂欄下面自己一行（見 .progress-row）。 */}
        {/* 睇返完整幅相嗰陣冇進度可言，個位攞返嚟擺關卡名。 */}
        {reviewing && (
          <div className="level-title">
            <span className="level-kicker">
              {t('game.levelKicker', { n: level.id, size: board.size })}
            </span>
            {t(`chapters.${level.chapterKey}`)}
          </div>
        )}

        <div className="top-bar-actions">
          {/* 睇返完整幅相嗰陣，復原／重新開始／提示／睇圖全部冇意義，
              淨係留返貼紙簿。 */}
          {!reviewing && (
          <>
          {/* 仲有次數就著金色 —— 設計用顏色分「有得用 / 用晒」，
              比單靠數字徽章一眼睇得清 */}
          <button
            className={`icon-btn${hintsLeft > 0 ? ' is-armed' : ''}`}
            onClick={handleHint}
            disabled={hintsLeft <= 0}
            aria-label={t('game.hint')}
          >
            <img src="/icons/hint-bulb.webp" alt="" />
            <span className="icon-btn-badge">{hintsLeft}</span>
          </button>

          </>
          )}

          {/* 貼紙簿。用彩色插畫版，同首頁入口一致 —— Alice 話線稿版
              喺呢個尺寸太細睇唔清。 */}
          <button className="icon-btn" onClick={openAlbum} aria-label={t('album.openAria')}>
            <img src="/icons/album.webp" alt="" />
          </button>

          {/* 睇圖：撳住先顯示，鬆手即收 —— 不是 toggle */}
          {!reviewing && (
          <button
            className="icon-btn"
            onPointerDown={handlePeekStart}
            onPointerUp={handlePeekEnd}
            onPointerLeave={handlePeekEnd}
            onPointerCancel={handlePeekEnd}
            /* ⚠️ 睇緊嗰陣唔可以 disabled —— 撳落去 peeksLeft 就減到 0，
               粒掣即刻停收事件，鬆手收唔到，overlay 會卡死。 */
            disabled={peeksLeft <= 0 && !peeking}
            aria-label={t('game.peekAria')}
          >
            <img src="/icons/peek.webp" alt="" />
            <span className="icon-btn-badge is-peek">{peeksLeft}</span>
          </button>
          )}
        </div>
      </div>

      {/* 進度條自己一行，唔再擠喺頂欄入面 —— Alice 要熊仔同軌道大啲，
          頂欄嗰行冇位再塞。⚠️ 呢一行嘅高度計咗入 --chrome-h，改高度就要
          一齊改嗰個常數，唔係棋盤會計錯闊度／廣告條會俾頂出畫面。 */}
      {!reviewing && (
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
            {MILESTONES.map((pct) => (
              <span
                key={pct}
                className={`progress-milestone${progressPct >= pct ? ' is-reached' : ''}`}
                style={{ left: `${pct}%` }}
                aria-hidden="true"
              >
                <img src={`/icons/milestone-${pct}.webp`} alt="" />
              </span>
            ))}
            {/* 星星旋鈕騎喺填充嘅前端跟住行。左右各收 12px（旋鈕半徑），
                否則 0% 同 100% 嗰陣粒星會凸出軌道外面。 */}
            <span
              className="progress-knob"
              style={{ left: `calc(12px + (100% - 24px) * ${progressPct} / 100)` }}
            >
              <Icon name="star" className="progress-knob-star" />
            </span>
          </div>
          <p className="progress-count">
            <b>{bonded}</b>/{totalBonds}
          </p>
        </div>
      )}

      <div className={`game-body${!reviewing && hintsLeft <= 0 ? ' has-dock' : ''}`}>
        <div className="board-wrap">
          {feedbackMsg && (
            <div className="feedback-badge" key={feedbackMsg.key}>
              {t(feedbackMsg.tierKey)}
              {feedbackMsg.comboCount > 1 && <span className="feedback-combo">×{feedbackMsg.comboCount}</span>}
            </div>
          )}
          <div className={`board-mat${solvedFlash || reviewing ? ' is-complete' : ''}`}>
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
                  /* 砌完之後唔再畫任何格線 —— 成幅相要乾乾淨淨咁
                     喺白框入面，同結算畫面嗰張相卡接得返上。 */
                  bonds={solvedFlash || reviewing ? null : bondsAt(board, position)}
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
            {solvedFlash && <span className="board-sparkles" aria-hidden="true" />}
          </div>
        </div>

        {/* 睇返完整幅相嗰陣，下面淨係一粒重玩。 */}
        {reviewing && (
          <div className="game-foot">
            <div className="tool-dock">
              <button type="button" className="primary-btn" onClick={startPlaying}>
                {t('game.replay')}
              </button>
            </div>
          </div>
        )}

        {/* 提示用晒先出現。平時完全唔 render，唔好長期霸住棋盤嘅高度 ——
            undo / hint / peek 喺頂欄，重新開始喺進度列。 */}
        {!reviewing && hintsLeft <= 0 && (
          <div className="game-foot">
            <div className="tool-dock">
              <button className="tool-btn" onClick={handleEarnHint}>
                <Icon name="video" className="tool-btn-icon" />
                <span className="label">{t('game.watchAdForHint')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 廣告版位：遊戲畫面底部橫幅 */}
      <AdSlot id="game-bottom-banner" format="banner" label={t('ads.bannerSlot')} />

      {isDevBuild() && !won && !reviewing && (
        <button type="button" className="dev-btn dev-solve" onClick={devSolve}>
          DEV 即刻過關
        </button>
      )}

      {/* 直接開返呢一關所屬嗰章 —— 玩緊邊個主題就見到邊個主題嘅貼紙 */}
      {albumProgress && (
        <AlbumScreen
          progress={albumProgress}
          onBack={closeAlbum}
          initialChapterId={level.chapterId}
          isOverlay
          backLabelKey="album.close"
        />
      )}

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
