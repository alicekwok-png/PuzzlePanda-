import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/home/claude/design-brief-assets';
fs.mkdirSync(OUT, { recursive: true });

function rankOf(label) {
  if (!label || label === '神秘卡，按一下揭開') return null;
  return label.split(' ')[0];
}

async function getCardLabels(page) {
  return page.$$eval('.playing-card', (els) => els.map((el) => el.getAttribute('aria-label')));
}

function findPair(labels, wantMatch) {
  for (let i = 0; i < labels.length; i++) {
    const ri = rankOf(labels[i]);
    if (!ri) continue;
    for (let j = i + 1; j < labels.length; j++) {
      const rj = rankOf(labels[j]);
      if (!rj) continue;
      if (wantMatch ? ri === rj : ri !== rj) return [i, j];
    }
  }
  return null;
}

async function clickCard(page, idx) {
  await page.locator('.playing-card').nth(idx).click();
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// 1. Home
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-home.png` });

// 2. Level select - fresh (only level 1 unlocked)
await page.getByText('開始遊戲').click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/02-level-select-fresh.png` });

// 2b. Level select - with progress (level1 completed, level2/3 unlocked)
await page.evaluate(() => {
  localStorage.setItem(
    'jigsawcard-solitaire-progress-v1',
    JSON.stringify({ unlocked: 3, completed: { 1: true }, bestMoves: { 1: 8 } })
  );
});
await page.reload({ waitUntil: 'networkidle' });
await page.getByText('開始遊戲').click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/02b-level-select-progress.png` });

// 3. Game default (level 1)
await page.locator('.level-tile').first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/03-game-default.png` });

// 4. Selected card state
{
  const labels = await getCardLabels(page);
  const pair = findPair(labels, true);
  if (pair) {
    await clickCard(page, pair[0]);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/04-card-selected.png` });
    // 5. Mismatch: click a card of a different rank than the selected one
    const labels2 = await getCardLabels(page);
    const selRank = rankOf(labels2[pair[0]]);
    let mismatchIdx = -1;
    for (let i = 0; i < labels2.length; i++) {
      const r = rankOf(labels2[i]);
      if (r && r !== selRank && i !== pair[0]) {
        mismatchIdx = i;
        break;
      }
    }
    if (mismatchIdx !== -1) {
      await clickCard(page, mismatchIdx);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${OUT}/05-mismatch.png` });
      await page.waitForTimeout(400);
    }
  }
}

// 6. Combo streak (two matches in a row) - reload level for a clean board
await page.getByLabel('返回').click();
await page.waitForTimeout(200);
await page.locator('.level-tile').first().click();
await page.waitForTimeout(250);
{
  for (let n = 0; n < 2; n++) {
    const labels = await getCardLabels(page);
    const pair = findPair(labels, true);
    if (!pair) break;
    await clickCard(page, pair[0]);
    await page.waitForTimeout(80);
    await clickCard(page, pair[1]);
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: `${OUT}/06-combo-streak.png` });
}

// 7. Hint highlighted
await page.getByLabel('提示').click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/07-hint.png` });

// 8/9. Mystery card facedown + flipped (level 5)
await page.getByLabel('返回').click();
await page.waitForTimeout(200);
await page.evaluate(() => {
  localStorage.setItem(
    'jigsawcard-solitaire-progress-v1',
    JSON.stringify({ unlocked: 5, completed: { 1: true, 2: true, 3: true, 4: true }, bestMoves: {} })
  );
});
await page.reload({ waitUntil: 'networkidle' });
await page.getByText('開始遊戲').click();
await page.waitForTimeout(200);
await page.locator('.level-tile').nth(4).click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/08-mystery-facedown.png` });
await page.locator('.playing-card.is-facedown').first().click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/09-mystery-flipped.png` });

// 10. Win modal - clear level 1 completely
await page.getByLabel('返回').click();
await page.waitForTimeout(200);
await page.locator('.level-tile').first().click();
await page.waitForTimeout(250);
for (let iter = 0; iter < 20; iter++) {
  const labels = await getCardLabels(page);
  const pair = findPair(labels, true);
  if (!pair) break;
  await clickCard(page, pair[0]);
  await page.waitForTimeout(80);
  await clickCard(page, pair[1]);
  await page.waitForTimeout(150);
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/10-win-modal.png` });

await browser.close();
console.log('Done. Files in', OUT);
console.log(fs.readdirSync(OUT));
