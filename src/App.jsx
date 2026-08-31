import { useEffect, useState } from 'react';
import AlbumScreen from './components/AlbumScreen';
import CompanySplash from './components/CompanySplash';
import DailyMission, { DailyMissionButton } from './components/DailyMission';
import Icon from './components/Icon';
import GameScreen from './components/GameScreen';
import IntroScreen from './components/IntroScreen';
import LevelSelect from './components/LevelSelect';
import SettingsScreen from './components/SettingsScreen';
import { useT } from './i18n/context';
import { LEVELS } from './game/levels';
import { loadProgress, resetProgress } from './game/storage';
import { hideBanner, initAds, showAppOpenAd, showBanner } from './services/ads';
import { isDevBuild, isUnlockAll, setUnlockAll } from './services/devMode';
import { feedback } from './services/feedback';

export default function App() {
  // 開 App：公司 splash → PuzzlePanda 開場動畫 → 首頁
  const [screen, setScreen] = useState('splash');
  const [progress, setProgress] = useState(() => loadProgress());
  const [activeLevel, setActiveLevel] = useState(null);
  const [devUnlock, setDevUnlock] = useState(() => isUnlockAll());
  const [showDaily, setShowDaily] = useState(false);
  const t = useT();

  // 開發者模式開啟時，關卡選擇看到的進度是「全部解鎖」，
  // 但真正存檔沒有被改成已完成，所以完成度統計仍然是真實的。
  const visibleProgress = devUnlock ? { ...progress, unlocked: LEVELS.length } : progress;

  useEffect(() => {
    // 開屏廣告：初始化完成後才嘗試，失敗不影響進入遊戲
    initAds().then(() => showAppOpenAd());
  }, []);

  // 橫幅只在有預留高度的畫面顯示（關卡選擇 / 遊戲中）。
  // 首頁沒有預留高度，橫幅會蓋住「開始遊戲」按鈕，所以那裡收起。
  useEffect(() => {
    // 貼紙簿都唔預留橫幅高度 —— 嗰頁要似一本簿，唔應該有廣告條夾住。
    if (screen === 'home' || screen === 'splash' || screen === 'intro' || screen === 'album') hideBanner();
    else showBanner();
  }, [screen]);

  function refreshProgress() {
    setProgress(loadProgress());
  }

  function goToLevels() {
    feedback.tap();
    refreshProgress();
    setScreen('levels');
  }

  function goToAlbum() {
    feedback.tap();
    refreshProgress();
    setScreen('album');
  }

  function handleSelectLevel(level) {
    setActiveLevel(level);
    setScreen('game');
  }

  function handleExitGame() {
    refreshProgress();
    setScreen('levels');
  }

  function handleNextLevel() {
    refreshProgress();
    const next = LEVELS.find((l) => l.id === activeLevel.id + 1);
    if (next) setActiveLevel(next);
  }

  if (screen === 'splash') {
    return <CompanySplash onFinish={() => setScreen('intro')} />;
  }

  if (screen === 'intro') {
    return <IntroScreen onFinish={() => setScreen('home')} />;
  }

  if (screen === 'home') {
    /* 總進度：全部 50 關入面完成咗幾多。首頁 hero 除咗裝飾之外要有一層
       實際資訊，唔好淨係得字同兩粒掣。 */
    const completedTotal = LEVELS.filter((l) => progress.completed[l.id]).length;

    return (
      /* 首頁唔用 .ambient（模糊遊戲相）—— hero 改用 puzzle piece 主題圖，
         見 index.css 嘅 .home-screen::after。 */
      <div className="screen home-screen">

        <button
          className="icon-btn home-settings"
          onClick={() => {
            feedback.tap();
            setScreen('settings');
          }}
          aria-label={t('home.settingsAria')}
        >
          <Icon name="gear" className="icon-btn-svg" />
        </button>

        {/* 左右各一個大插畫入口，設定喺角落 —— 跟參考 app 嘅版面。
            塞落 40px 嘅細掣入面張插畫會細到睇唔出係咩，白畫。 */}
        <button type="button" className="home-corner is-left" onClick={goToAlbum}>
          <span className="home-corner-art">
            <img src="/icons/album.webp" alt="" />
          </span>
          <span className="home-corner-label">{t('album.title')}</span>
        </button>

        {/* 每日任務入口。⚠️ 用真實 progress 唔用 visibleProgress ——
            開發者模式「解鎖全部關卡」唔應該連每日任務都解埋，佢睇嘅係
            completed[10]，唔係 unlocked。 */}
        <DailyMissionButton progress={progress} onOpen={() => setShowDaily(true)} />

        <div className="home-hero">
          <img className="home-logo" src="/icons/logo.png" alt="" />
          {/* 遊戲只有英文名，三種語言都顯示 PuzzlePanda，不翻譯 */}
          <h1>{t('home.title')}</h1>
          <p className="home-subtitle">{t('home.subtitle')}</p>

          {/* 總進度徽章 */}
          <p className="home-progress">
            <Icon name="star" className="home-progress-star" />
            <b>{completedTotal}</b>
            <span>/{LEVELS.length}</span>
          </p>
        </div>
        {/* 貼紙簿搬咗上左上角，所以下面淨返一粒主 CTA，可以做到大大粒 */}
        <button className="primary-btn big home-start" onClick={goToLevels}>
          {t('home.startButton')}
        </button>

        {/* 開發者列：只在 npm run dev 或網址帶 ?dev=1 時出現。
            正式打包會被 Vite 整段移除，玩家看不到。 */}
        {isDevBuild() && (
          <div className="dev-bar">
            <span className="dev-bar-tag">DEV</span>
            <button
              type="button"
              className={`dev-btn${devUnlock ? ' is-on' : ''}`}
              onClick={() => {
                // 只覆蓋顯示，不寫存檔 —— 所以關掉之後真實進度原封不動
                const next = !devUnlock;
                setUnlockAll(next);
                setDevUnlock(next);
              }}
            >
              {devUnlock ? `全 ${LEVELS.length} 關已解鎖` : '解鎖全部關卡'}
            </button>
            <button
              type="button"
              className="dev-btn"
              onClick={() => {
                resetProgress();
                setUnlockAll(false);
                setDevUnlock(false);
                setProgress(loadProgress());
              }}
            >
              重設進度
            </button>
          </div>
        )}

        {showDaily && (
          <DailyMission progress={progress} onClose={() => setShowDaily(false)} />
        )}
      </div>
    );
  }

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('home')} />;
  }

  if (screen === 'album') {
    // 用 visibleProgress：開發者模式解鎖全部關卡時，貼紙簿一樣照跟真實
    // 完成紀錄，唔會扮晒儲齊（unlocked 同 completed 係兩件事）。
    return <AlbumScreen progress={visibleProgress} onBack={() => setScreen('home')} />;
  }

  if (screen === 'levels') {
    return (
      <LevelSelect
        progress={visibleProgress}
        onSelectLevel={handleSelectLevel}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <GameScreen
      key={activeLevel.id}
      level={activeLevel}
      totalLevels={LEVELS.length}
      onExit={handleExitGame}
      onNextLevel={handleNextLevel}
    />
  );
}
