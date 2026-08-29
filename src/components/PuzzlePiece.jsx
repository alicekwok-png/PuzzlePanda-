export default function PuzzlePiece({
  pieceId,
  position,
  size,
  background,
  placed,
  bonds,
  justBonded,
  dragging,
  groupDragging,
  dropTarget,
  offset,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const row = Math.floor(pieceId / size);
  const col = pieceId % size;
  const posRow = Math.floor(position / size);
  const posCol = position % size;
  const bgPos = size === 1 ? '0% 0%' : `${(col / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`;

  const classes = ['piece'];
  if (placed) classes.push('is-placed');
  if (justBonded) classes.push('is-just-bonded');
  if (dragging) classes.push('is-dragging');
  if (groupDragging) classes.push('is-group-dragging');
  if (dropTarget) classes.push('is-drop-target');

  const style = {
    gridColumn: posCol + 1,
    gridRow: posRow + 1,
    backgroundImage: background,
    backgroundSize: `${size * 100}% ${size * 100}%`,
    backgroundPosition: bgPos,
  };

  /* 每塊都填滿自己那一格，縫隙不是靠縮細做出來，而是靠「未接合的邊才
     畫線」。接合了的邊完全不畫 —— 兩塊就無縫黏成一片，這就是玩家看到
     的「黐埋咗」。
     已經在絕對正確位置的那一嚿，外框改用設計的 teal，同時回答「砌啱未」
     同「擺對位未」兩件事。

     ⚠️ 落點提示都要喺呢度用 inline style 畫：inline boxShadow 會蓋過
     class 入面嘅 .is-drop-target，兩者唔可以分開兩處寫。 */
  if (dropTarget && !dragging && !groupDragging) {
    style.boxShadow = 'inset 0 0 0 3px var(--teal), inset 0 0 0 999px rgba(215, 240, 236, 0.42)';
  } else if (bonds && !dragging && !groupDragging) {
    const w = placed ? 3 : 1;
    const line = placed ? 'var(--teal)' : 'rgba(0, 0, 0, 0.62)';
    const sides = [];
    if (!bonds.up) sides.push(`inset 0 ${w}px 0 0 ${line}`);
    if (!bonds.down) sides.push(`inset 0 -${w}px 0 0 ${line}`);
    if (!bonds.left) sides.push(`inset ${w}px 0 0 0 ${line}`);
    if (!bonds.right) sides.push(`inset -${w}px 0 0 0 ${line}`);
    // 未歸位的散塊在頂邊加一道極淡高光，讀起來像一塊有厚度的碎片
    if (!placed && !bonds.up) sides.push('inset 0 3px 0 -1px rgba(255, 255, 255, 0.16)');
    if (sides.length) style.boxShadow = sides.join(', ');
  }

  /* 拖曳姿態跟設計：拎起嚟會放大並向左傾，明顯係「手上嗰塊」。 */
  if (dragging) {
    style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1.2) rotate(-4deg)`;
  } else if (groupDragging) {
    // 整嚿一起跟手。抬起幅度細很多，讀起來像「一整塊」而不是一堆碎片。
    style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1.03)`;
  }

  return (
    <div
      className={classes.join(' ')}
      style={style}
      /* 事件永遠掛著，由 handler 自己判斷有沒有在拖曳。 */
      onPointerDown={(e) => onPointerDown(e, position)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
