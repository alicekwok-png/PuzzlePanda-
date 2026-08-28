import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5183/');
await page.click('text=開始遊戲');
await page.waitForSelector('.level-tile');
await page.click('.level-tile >> nth=0');
await page.waitForSelector('.board');
await page.screenshot({ path: '/tmp/board_start.png' });

// Try a drag swap between piece at position 0 and position 1
const pieces = await page.$$('.piece');
console.log('piece count', pieces.length);
const box0 = await pieces[0].boundingBox();
const box1 = await pieces[1].boundingBox();

await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
await page.mouse.down();
await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, { steps: 5 });
await page.screenshot({ path: '/tmp/board_dragging.png' });
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/board_after_swap.png' });

const movesText = await page.textContent('.moves-label');
console.log('moves label:', movesText);

// hint check
await page.click('.icon-btn[aria-label="提示"]');
await page.waitForTimeout(200);
const hinted = await page.$$('.piece.is-hinted');
console.log('hinted pieces:', hinted.length);
await page.screenshot({ path: '/tmp/board_hint.png' });

console.log('console/page errors:', errors);
await browser.close();
