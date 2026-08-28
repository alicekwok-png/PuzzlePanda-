import { useT } from '../i18n/context';

export default function WinModal({ level, moves, bestMoves, hasNext, onNext, onReplay, onExit }) {
  const t = useT();
  const isNewBest = bestMoves != null && moves <= bestMoves;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t('win.ariaLabel')}>
      <div className="modal-card">
        {/* 獎勵是「收藏到一張完整的照片」，不是一個分數 */}
        <div className="modal-photo" style={{ backgroundImage: level.theme.background }} />

        {/* 每完成一關獲得該章第 N 張貼紙。貼紙狀態完全由 progress.completed
            推導，沒有額外 storage 欄位。 */}
        <div className="sticker-earned">
          <img
            className="sticker-earned-img"
            src={`/stickers/${level.chapterKey}/sticker-0${level.levelInChapter}.jpg`}
            alt=""
          />
          <span className="sticker-earned-label">{t('win.stickerEarned')}</span>
        </div>
        <p className="modal-kicker">{isNewBest ? t('win.kickerNewBest') : t('win.kickerComplete')}</p>
        <h2>{t('win.heading')}</h2>
        <p className="modal-level-name">
          {t('win.levelLine', { n: level.id, chapterName: t(`chapters.${level.chapterKey}`) })}
        </p>

        <div className="modal-stats">
          <div className="modal-stat">
            <span className="v">{moves}</span>
            <span className="k">{t('win.statMoves')}</span>
          </div>
          <div className="modal-stat">
            <span className="v">
              {level.size}×{level.size}
            </span>
            <span className="k">{t('win.statDifficulty')}</span>
          </div>
          {bestMoves != null && (
            <div className="modal-stat">
              <span className="v">{bestMoves}</span>
              <span className="k">{t('win.statBest')}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          {hasNext && (
            <button className="primary-btn" onClick={onNext}>
              {t('win.nextLevel')}
            </button>
          )}
          <button className="secondary-btn" onClick={onReplay}>
            {t('win.playAgain')}
          </button>
          <button className="secondary-btn" onClick={onExit}>
            {t('win.backToLevels')}
          </button>
        </div>
      </div>
    </div>
  );
}
