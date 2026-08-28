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

// Use the hint to find a guaranteed-correct swap, then perform it.
await page.click('.icon-btn[aria-label="提示"]');
await page.waitForTimeout(150);
const hinted = await page.$$('.piece.is-hinted');
console.log('hinted count', hinted.length);
const boxA = await hinted[0].boundingBox();
const boxB = await hinted[1].boundingBox();

await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
await page.mouse.down();
await page.mouse.move(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/combo_feedback.png' });

const badge = await page.$('.feedback-badge');
console.log('feedback badge present:', !!badge);
if (badge) console.log('badge text:', await badge.textContent());

console.log('errors:', errors);
await browser.close();
