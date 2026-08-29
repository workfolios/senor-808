import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const expectedRailIds = [17, 5, 11, 2, 13, 4, 3, 15, 7, 14, 10, 16];
const expectedGridIds = [1, 18, 12, 6, 20, 8, 19, 9, 21, 26, 22, 25, 24, 23, 27, 28];
const expectedBioHeadings = ['Studio Practice', 'Visual Lineage', 'Visual Language', 'Image Meets Voice'];
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
const arraysEqual = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

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
  const visibleGridCards = gridCards.filter((card) => getComputedStyle(card).display !== 'none' && !card.hidden);
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
  const railIds = railCards.map((card) => Number(card.dataset.workId));
  const gridVisibleIds = visibleGridCards.map((card) => Number(card.dataset.workId));
  const combinedIds = [...railIds, ...gridVisibleIds];

  return {
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    workOverflow: work ? work.scrollWidth > work.clientWidth + 1 : true,
    railVisible: rail ? getComputedStyle(rail).display !== 'none' : false,
    railScrollable: viewport ? viewport.scrollWidth > viewport.clientWidth + 1 : false,
    railCount: railCards.length,
    railIds,
    railFirstTitle: railCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    gridVisibleCount: visibleGridCards.length,
    gridVisibleIds,
    gridFirstTitle: visibleGridCards[0]?.querySelector('.work-meta strong')?.textContent?.trim() || null,
    combinedCount: combinedIds.length,
    combinedUniqueCount: new Set(combinedIds).size,
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

const getBioMetrics = async (page) => page.evaluate(() => {
  const card = document.querySelector('.bio-modal-card');
  const body = document.querySelector('.bio-modal-body');
  const endcap = document.querySelector('.bio-signature-endcap');
  const rect = card?.getBoundingClientRect();
  const bodyStyles = body ? getComputedStyle(body) : null;
  const text = body?.textContent || '';
  return {
    headings: Array.from(document.querySelectorAll('.bio-modal-section h3')).map((heading) => heading.textContent?.trim() || ''),
    hasInterpretiveLineage: text.includes('interpretive lineage'),
    hasOneToOneQualifier: text.includes('one-to-one classification'),
    hasPrimaryPractice: text.includes('Visual art remains the established primary practice.'),
    staleFiftyFiftyAbsent: !text.includes('50/50'),
    modalContained: Boolean(rect && rect.top >= -1 && rect.bottom <= window.innerHeight + 1 && rect.left >= -1 && rect.right <= window.innerWidth + 1),
    bodyScrollEnabled: Boolean(bodyStyles && ['auto', 'scroll'].includes(bodyStyles.overflowY)),
    bodyClientHeight: body instanceof HTMLElement ? body.clientHeight : 0,
    bodyScrollHeight: body instanceof HTMLElement ? body.scrollHeight : 0,
    endcapPresent: Boolean(endcap),
    endcapLoaded: endcap instanceof HTMLImageElement ? endcap.complete && endcap.naturalWidth > 0 : false,
    endcapSrcCorrect: endcap instanceof HTMLImageElement ? endcap.src.includes('assets_work_808-emblem.opt.webp') : false,
    endcapDecorative: endcap instanceof HTMLImageElement ? endcap.alt === '' && endcap.getAttribute('aria-hidden') === 'true' : false,
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
      ['12 rail cards', allMetrics.railCount === 12],
      ['curated rail IDs and order', arraysEqual(allMetrics.railIds, expectedRailIds)],
      ['808 Emblem leads rail', allMetrics.railFirstTitle === '808 Emblem'],
      ['16 grid cards visible', allMetrics.gridVisibleCount === 16],
      ['curated grid IDs and order', arraysEqual(allMetrics.gridVisibleIds, expectedGridIds)],
      ['grid begins with After Hours Frequency', allMetrics.gridFirstTitle === 'After Hours Frequency'],
      ['all 28 works represented exactly once', allMetrics.combinedCount === 28 && allMetrics.combinedUniqueCount === 28],
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
    await work.screenshot({ path: path.join(outputDir, `${viewport.name}-mixed-media.png`) });

    checks.push(['rail hidden when filtered', !filteredMetrics.railVisible]);
    checks.push(['20 Mixed Media works', filteredMetrics.gridVisibleCount === 20]);
    checks.push(['808 Emblem leads filtered grid', filteredMetrics.gridFirstTitle === '808 Emblem']);
    checks.push(['filtered grid columns', filteredMetrics.firstRowCount === viewport.expectedColumns]);
    checks.push(['chronology language absent when filtered', filteredMetrics.chronologyLanguageAbsent]);

    await page.locator('.work-grid .work-card:not(.skeleton-card)').first().click();
    await page.locator('.lightbox.active').waitFor({ state: 'visible' });
    await page.waitForTimeout(80);
    checks.push(['filtered initial lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '1 / 20']);
    await page.getByRole('button', { name: 'Next artwork' }).click();
    await page.waitForTimeout(80);
    checks.push(['filtered next stays in curated category order', (await page.locator('#lightbox-title').textContent())?.trim() === 'Direct Gaze']);
    checks.push(['filtered lightbox counter', (await page.locator('.lightbox figcaption > span').textContent())?.trim() === '2 / 20']);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(80);
    checks.push(['filtered keyboard navigation stays in category', (await page.locator('#lightbox-title').textContent())?.trim() === '808 Emblem']);
    await page.getByRole('button', { name: 'Close artwork view' }).click();

    const bioTrigger = page.getByRole('button', { name: 'Read Full Bio' });
    await bioTrigger.click();
    await page.locator('.modal.active .bio-modal-card').waitFor({ state: 'visible' });
    const bioMetrics = await getBioMetrics(page);
    await page.locator('.modal.active').screenshot({ path: path.join(outputDir, `${viewport.name}-full-bio.png`) });

    checks.push(['bio section hierarchy', arraysEqual(bioMetrics.headings, expectedBioHeadings)]);
    checks.push(['bio uses interpretive-lineage qualifier', bioMetrics.hasInterpretiveLineage && bioMetrics.hasOneToOneQualifier]);
    checks.push(['bio keeps visual art primary', bioMetrics.hasPrimaryPractice]);
    checks.push(['stale 50/50 framing absent', bioMetrics.staleFiftyFiftyAbsent]);
    checks.push(['bio modal contained in viewport', bioMetrics.modalContained]);
    checks.push(['bio body supports internal scrolling', bioMetrics.bodyScrollEnabled]);
    checks.push(['bio emblem endcap present and loaded', bioMetrics.endcapPresent && bioMetrics.endcapLoaded]);
    checks.push(['bio emblem reuses approved asset', bioMetrics.endcapSrcCorrect]);
    checks.push(['bio emblem endcap is decorative', bioMetrics.endcapDecorative]);

    await page.getByRole('button', { name: 'Close biography' }).click();
    await page.waitForTimeout(80);
    checks.push(['bio close restores trigger focus', await bioTrigger.evaluate((element) => document.activeElement === element)]);

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, allMetrics, filteredMetrics, bioMetrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(path.join(outputDir, 'README.md'), `# Señor 808 Curated Selected Work + Full Bio QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`, 'utf8');
if (failures.length > 0) throw new Error(`Curated gallery and full bio QA failed:\n${failures.join('\n')}`);
