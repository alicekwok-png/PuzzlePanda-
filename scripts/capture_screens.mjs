/**
 * 截取主要畫面成 PNG，方便交給設計 / IT 看。
 * 用法： node scripts/capture_screens.mjs [baseUrl] [outDir]
 * 預設 http://localhost:3000 → screenshots/
 *
 * 用 iPhone 14 Pro 的 390x844 @3x，出圖 1170x2532，跟真機一致。
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const outDir = process.argv[3] ?? 'screenshots';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

async function shot(name) {
  // 等圖片解碼完成，否則會拍到空白格
  await page.evaluate(() => Promise.all(
    [...document.querySelectorAll('img')].map((i) => (i.complete ? null : i.decode().catch(() => {}))),
  ));
  await wait(600);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

// 開發者模式：解鎖全部關卡，方便截圖
await page.goto(baseUrl);
await page.evaluate(() => localStorage.setItem('jigsawcard-devmode-unlock-all', '1'));
await page.goto(baseUrl);

console.log('截圖中…');

// 1. 開場動畫
await wait(1200);
await shot('01-intro');

// 2. 首頁
await page.click('.intro-skip');
await wait(500);
await shot('02-home');

// 3. 主題章節
await page.click('.primary-btn.big');
await wait(900);
await shot('03-chapters');

// 4. 第 1 章關卡選擇
await page.click('.chapter-tile >> nth=0');
await wait(900);
await shot('04-chapter1-levels');

// 5. 遊戲畫面（開局）
await page.click('.level-tile >> nth=0');
await wait(900);
await shot('05-game-start');

// 6. 遊戲畫面（用兩次提示，展示綠框合併與連擊字樣）
const hint = page.locator('.top-bar .icon-btn').nth(2);
await hint.click();
await wait(500);
await hint.click();
await wait(250);
await shot('06-game-combo');

// 7. 睇圖預覽（撳住）
const peek = page.locator('.top-bar .icon-btn').nth(3);
await peek.dispatchEvent('pointerdown');
await wait(500);
await shot('07-peek');
await peek.dispatchEvent('pointerup');

// 8. 設定
await page.click('.top-bar .icon-btn >> nth=0');
await wait(500);
await page.click('.top-bar .icon-btn >> nth=0');
await wait(500);
await page.click('.top-bar .icon-btn >> nth=0');
await wait(500);
await page.click('.home-settings');
await wait(500);
await shot('08-settings');

await browser.close();
console.log(`\n完成，輸出在 ${outDir}/`);
