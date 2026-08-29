import { useT } from '../i18n/context';

export default function WinModal({ level, moves, bestMoves, hasNext, onNext, onReplay, onExit }) {
  const t = useT();
  const isNewBest = bestMoves != null && moves <= bestMoves;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t('win.ariaLabel')}>
      <div className="modal-card">
        {/* 獎勵是「收藏到一張完整的照片」，不是一個分數。
            後面兩張歪住嘅卡由 CSS 的 ::before / ::after 畫，讀起來像
            「又收多咗一張入相簿」。 */}
        <div className="modal-photo-stack">
          <div className="modal-photo">
            <span style={{ backgroundImage: level.theme.background }} />
          </div>
        </div>

        {/* 每完成一關獲得該章第 N 張貼紙。貼紙狀態完全由 progress.completed
            推導，沒有額外 storage 欄位。
            用同一批去底貼紙（見 scripts/prepare_stickers.py）—— 貼紙簿同
            這裡共用一套資源，不會出現「同一張貼紙兩個樣」。舊的 .jpg 版本
            自帶深藍方塊底，貼在虛線框裡會變成「框裡再有一張卡」。 */}
        <div className="sticker-earned">
          <img
            className="sticker-earned-img"
            src={`/stickers/${level.chapterKey}/sticker-0${level.levelInChapter}.webp`}
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
            <button className="primary-btn is-next" onClick={onNext}>
              {t('win.nextLevel')}
            </button>
          )}
          {/* 兩個次要動作並排，唔好同綠色主鍵爭注意力 */}
          <div className="secondary-row">
            <button className="secondary-btn" onClick={onReplay}>
              {t('win.playAgain')}
            </button>
            <button className="secondary-btn" onClick={onExit}>
              {t('win.backToLevels')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
