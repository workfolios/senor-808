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
  const rail = document.querySelector('.recent-additions-shell');
  const viewport = document.querySelector('.recent-additions-viewport');
  const recentCards = Array.from(document.querySelectorAll('.recent-addition-card'));
  const gridCards = Array.from(document.querySelectorAll('.work-grid .work-card:not(.skeleton-card)'));
  const visibleGridCards = gridCards.filter((card) => getComputedStyle(card).display !== 'none');
  const firstTop = visibleGridCards[0]?.getBoundingClientRect().top ?? null;
  const firstRowCount = firstTop === null ? 0 : visibleGridCards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2).length;
  const imageFailures = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
  return {
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    workOverflow: work ? work.scrollWidth > work.clientWidth + 1 : true,
    railVisible: rail ? getComputedStyle(rail).display !== 'none' : false,
    railScrollable: viewport ? viewport.scrollWidth > viewport.clientWidth + 1 : false,
    recentCount: recentCards.length,
    recentFirstTitle: recentCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    gridVisibleCount: visibleGridCards.length,
    gridFirstTitle: visibleGridCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    firstRowCount,
    imageFailureCount: imageFailures.length,
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

    const checks = [
      ['no page overflow', !allMetrics.horizontalOverflow],
      ['no gallery overflow', !allMetrics.workOverflow],
      ['rail visible', allMetrics.railVisible],
      ['rail scrollable', allMetrics.railScrollable],
      ['18 recent cards', allMetrics.recentCount === 18],
      ['recent additions first', allMetrics.recentFirstTitle === 'Prism Relay'],
      ['10 legacy cards visible', allMetrics.gridVisibleCount === 10],
      ['legacy selection follows rail', allMetrics.gridFirstTitle === 'After Hours Frequency'],
      ['responsive compact-grid columns', allMetrics.firstRowCount === viewport.expectedColumns],
      ['all images loaded', allMetrics.imageFailureCount === 0],
    ];

    const railViewport = page.locator('.recent-additions-viewport');
    const beforeScroll = await railViewport.evaluate((element) => element.scrollLeft);
    await page.getByRole('button', { name: 'Scroll recent artwork forward' }).click();
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
    checks.push(['filtered recent work first', filteredMetrics.gridFirstTitle === 'Prism Relay']);
    checks.push(['filtered grid columns', filteredMetrics.firstRowCount === viewport.expectedColumns]);
    checks.push(['August cohort precedes legacy work', filteredTitles.indexOf('After Hours Frequency') > filteredTitles.indexOf('Branching Profile')]);

    await page.locator('.work-grid .work-card:not(.skeleton-card)').first().click();
    await page.locator('.lightbox.active').waitFor({ state: 'visible' });
    await page.waitForTimeout(80);
    checks.push(['filtered initial lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '1 / 20']);
    await page.getByRole('button', { name: 'Next artwork' }).click();
    await page.waitForTimeout(80);
    checks.push(['filtered next stays in category', (await page.locator('#lightbox-title').textContent())?.trim() === 'Pressure Loop']);
    checks.push(['filtered lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '2 / 20']);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(80);
    checks.push(['filtered keyboard navigation stays in category', (await page.locator('#lightbox-title').textContent())?.trim() === 'Prism Relay']);

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, allMetrics, filteredMetrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(path.join(outputDir, 'README.md'), `# Señor 808 Selected Work Gallery Refinement QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`, 'utf8');
if (failures.length > 0) throw new Error(`Gallery refinement QA failed:\n${failures.join('\n')}`);
