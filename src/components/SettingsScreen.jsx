import { LEVELS } from '../game/levels';
import { useI18n } from '../i18n/context';
import { LANGUAGES } from '../i18n/languages';
import { feedback } from '../services/feedback';
import AdSlot from './AdSlot';

export default function SettingsScreen({ onBack }) {
  const { lang, changeLanguage, t } = useI18n();

  return (
    <div className="screen settings-screen" style={{ '--level-bg': LEVELS[0].theme.background }}>
      <div className="ambient" />

      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label={t('nav.backHome')}>
          <img src="/icons/back.png" alt="" />
        </button>
        <div className="level-title">{t('settings.title')}</div>
        <div className="top-bar-spacer" />
      </div>

      <div className="settings-body">
        <h2 className="settings-group-title">{t('settings.language')}</h2>
        <div className="settings-group" role="radiogroup" aria-label={t('settings.language')}>
          {LANGUAGES.map((option) => {
            const selected = option.code === lang;
            return (
              <button
                key={option.code}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`settings-row${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  feedback.tap();
                  changeLanguage(option.code);
                }}
              >
                {/* 語言名永遠用自己的語言顯示，不跟著介面語言變 —— 否則
                    使用者看不懂自己要選哪一個 */}
                <span className="settings-row-label" lang={option.htmlLang}>
                  {option.label}
                </span>
                <span className="settings-row-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 廣告版位：設定頁底部橫幅 */}
      <AdSlot id="settings-bottom-banner" format="banner" label={t('ads.bannerSlot')} />
    </div>
  );
}
