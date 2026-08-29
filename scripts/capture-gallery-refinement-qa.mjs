import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedColumns: 2 },
  { name: 'mobile-390', width: 390, height: 844, expectedColumns: 2 },
  { name: 'tablet-768', width: 768, height: 1024, expectedColumns: 2 },
  { name: 'tablet-820', width: 820, height: 1180, expectedColumns: 2 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedColumns: 3 },
  { name: 'desktop-1280', width: 1280, height: 900, expectedColumns: 4 },
  { name: 'desktop-1440', width: 1440, height: 900, expectedColumns: 4 },
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const findings = [];
const failures = [];
const browser = await chromium.launch({ headless: true });

const preparePage = async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}.reveal-on-scroll{opacity:1!important;transform:none!important}' });
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; });
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.scrollTo(0, 0);
    await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
  });
  await page.waitForTimeout(250);
};

const getMetrics = async (page) => page.evaluate(() => {
  const work = document.querySelector('#work');
  const rail = document.querySelector('.selected-work-rail-shell');
  const viewport = document.querySelector('.selected-work-rail-viewport');
  const railCards = Array.from(document.querySelectorAll('.selected-work-rail-card'));
  const gridCards = Array.from(document.querySelectorAll('.work-grid .work-card:not(.skeleton-card)'));
  const visibleGridCards = gridCards.filter((card) => getComputedStyle(card).display !== 'none');
  const firstTop = visibleGridCards[0]?.getBoundingClientRect().top ?? null;
  const firstRowCount = firstTop === null ? 0 : visibleGridCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2).length;
  const imageFailures = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
  const galleryText = work?.textContent?.toLowerCase() || '';
  const forbiddenPublicPhrases = ['recent portfolio additions', 'august 28', 'release ·', 'earlier portfolio selection', 'more selected work'];
  const signature = document.querySelector('.portrait-signature-mark');
  const portrait = document.querySelector('#about .portrait-card');
  const signatureRect = signature?.getBoundingClientRect();
  const portraitRect = portrait?.getBoundingClientRect();
  const signatureInsidePortrait = Boolean(signatureRect && portraitRect &&
    signatureRect.left >= portraitRect.left - 1 && signatureRect.right <= portraitRect.right + 1 &&
    signatureRect.top >= portraitRect.top - 1 && signatureRect.bottom <= portraitRect.bottom + 1);

  return {
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    workOverflow: work ? work.scrollWidth > work.clientWidth + 1 : true,
    railVisible: rail ? getComputedStyle(rail).display !== 'none' : false,
    railScrollable: viewport ? viewport.scrollWidth > viewport.clientWidth + 1 : false,
    railCount: railCards.length,
    railFirstTitle: railCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    gridVisibleCount: visibleGridCards.length,
    gridFirstTitle: visibleGridCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    firstRowCount,
    imageFailureCount: imageFailures.length,
    chronologyLanguageAbsent: forbiddenPublicPhrases.every((phrase) => !galleryText.includes(phrase)),
    signaturePresent: Boolean(signature),
    signatureLoaded: signature instanceof HTMLImageElement ? signature.complete && signature.naturalWidth > 0 : false,
    signatureSrcCorrect: signature instanceof HTMLImageElement ? signature.src.includes('assets_work_808-emblem.opt.webp') : false,
    signatureAltCorrect: signature instanceof HTMLImageElement ? signature.alt === 'Señor 808 signature emblem' : false,
    signatureInsidePortrait,
  };
});

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await preparePage(page);
    const work = page.locator('#work');
    await work.scrollIntoViewIfNeeded();

    const allMetrics = await getMetrics(page);
    await work.screenshot({ path: path.join(outputDir, `${viewport.name}-all.png`) });
    await page.locator('#about').screenshot({ path: path.join(outputDir, `${viewport.name}-creative-focus-signature.png`) });

    const checks = [
      ['no page overflow', !allMetrics.horizontalOverflow],
      ['no gallery overflow', !allMetrics.workOverflow],
      ['rail visible', allMetrics.railVisible],
      ['rail scrollable', allMetrics.railScrollable],
      ['18 rail cards', allMetrics.railCount === 18],
      ['808 Emblem leads rail', allMetrics.railFirstTitle === '808 Emblem'],
      ['10 grid cards visible', allMetrics.gridVisibleCount === 10],
      ['grid follows rail', allMetrics.gridFirstTitle === 'After Hours Frequency'],
      ['responsive compact-grid columns', allMetrics.firstRowCount === viewport.expectedColumns],
      ['chronology language absent', allMetrics.chronologyLanguageAbsent],
      ['signature present', allMetrics.signaturePresent],
      ['signature loaded', allMetrics.signatureLoaded],
      ['signature uses approved asset', allMetrics.signatureSrcCorrect],
      ['signature alt is contextual', allMetrics.signatureAltCorrect],
      ['signature remains inside portrait card', allMetrics.signatureInsidePortrait],
      ['all images loaded', allMetrics.imageFailureCount === 0],
    ];

    const firstRailCard = page.locator('.selected-work-rail-card').first();
    await firstRailCard.click();
    await page.locator('.lightbox.active').waitFor({ state: 'visible' });
    checks.push(['rail first card opens 808 Emblem', (await page.locator('#lightbox-title').textContent())?.trim() === '808 Emblem']);
    await page.getByRole('button', { name: 'Close artwork view' }).click();
    await page.waitForTimeout(60);

    const railViewport = page.locator('.selected-work-rail-viewport');
    const beforeScroll = await railViewport.evaluate((element) => element.scrollLeft);
    await page.getByRole('button', { name: 'Scroll artwork forward' }).click();
    await page.waitForTimeout(100);
    const afterScroll = await railViewport.evaluate((element) => element.scrollLeft);
    checks.push(['rail forward control advances', afterScroll > beforeScroll]);

    await page.getByRole('button', { name: 'Mixed Media' }).click();
    await page.waitForTimeout(450);
    const filteredMetrics = await getMetrics(page);
    const filteredTitles = await page.locator('.work-grid .work-card:not(.skeleton-card) .work-meta strong').allTextContents();
    await work.screenshot({ path: path.join(outputDir, `${viewport.name}-mixed-media.png`) });

    checks.push(['rail hidden when filtered', !filteredMetrics.railVisible]);
    checks.push(['20 Mixed Media works', filteredMetrics.gridVisibleCount === 20]);
    checks.push(['808 Emblem leads filtered grid', filteredMetrics.gridFirstTitle === '808 Emblem']);
    checks.push(['filtered grid columns', filteredMetrics.firstRowCount === viewport.expectedColumns]);
    checks.push(['showcase group precedes original selection', filteredTitles.indexOf('After Hours Frequency') > filteredTitles.indexOf('Branching Profile')]);
    checks.push(['chronology language absent when filtered', filteredMetrics.chronologyLanguageAbsent]);

    await page.locator('.work-grid .work-card:not(.skeleton-card)').first().click();
    await page.locator('.lightbox.active').waitFor({ state: 'visible' });
    await page.waitForTimeout(80);
    checks.push(['filtered initial lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '1 / 20']);
    await page.getByRole('button', { name: 'Next artwork' }).click();
    await page.waitForTimeout(80);
    checks.push(['filtered next stays in category', (await page.locator('#lightbox-title').textContent())?.trim() === 'Prism Relay']);
    checks.push(['filtered lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '2 / 20']);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(80);
    checks.push(['filtered keyboard navigation stays in category', (await page.locator('#lightbox-title').textContent())?.trim() === '808 Emblem']);

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, allMetrics, filteredMetrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(path.join(outputDir, 'README.md'), `# Señor 808 Selected Work + Signature QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`, 'utf8');
if (failures.length > 0) throw new Error(`Gallery and signature QA failed:\n${failures.join('\n')}`);
