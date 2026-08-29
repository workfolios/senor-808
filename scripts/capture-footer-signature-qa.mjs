import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedEmblem: 64, expectedColumns: 2 },
  { name: 'mobile-390', width: 390, height: 844, expectedEmblem: 68, expectedColumns: 2 },
  { name: 'tablet-768', width: 768, height: 1024, expectedEmblem: 88, expectedColumns: 3 },
  { name: 'tablet-820', width: 820, height: 1180, expectedEmblem: 88, expectedColumns: 3 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedEmblem: 100, expectedColumns: 3 },
  { name: 'desktop-1280', width: 1280, height: 900, expectedEmblem: 112, expectedColumns: 3 },
  { name: 'desktop-1440', width: 1440, height: 900, expectedEmblem: 112, expectedColumns: 3 },
];

await fs.mkdir(outputDir, { recursive: true });

const findings = [];
const failures = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}.reveal-on-scroll{opacity:1!important;transform:none!important}' });
    await page.evaluate(async () => {
      document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; });
      window.scrollTo(0, document.documentElement.scrollHeight);
      await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
    });
    await page.waitForTimeout(250);

    const footer = page.locator('.site-footer');
    await footer.scrollIntoViewIfNeeded();
    await footer.screenshot({ path: path.join(outputDir, `${viewport.name}-footer-signature-anchor.png`) });

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const grid = document.querySelector('.site-footer .footer-grid');
      const emblem = document.querySelector('.footer-signature-emblem');
      const wordmark = document.querySelector('.site-footer .footer-brand img');
      const tagline = document.querySelector('.site-footer .footer-tagline');
      const heading = document.querySelector('.site-footer .footer-heading');
      const nav = document.querySelector('.site-footer .footer-links > nav');
      const meta = document.querySelector('.site-footer .footer-meta');
      const gridRect = grid?.getBoundingClientRect();
      const emblemRect = emblem?.getBoundingClientRect();
      const wordmarkRect = wordmark?.getBoundingClientRect();
      const taglineRect = tagline?.getBoundingClientRect();
      const headingRect = heading?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      const metaRect = meta?.getBoundingClientRect();
      const emblemStyle = emblem ? getComputedStyle(emblem) : null;
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const gridColumns = gridStyle?.gridTemplateColumns
        ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
      const imagesFailed = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
      const insideGrid = Boolean(gridRect && emblemRect &&
        emblemRect.left >= gridRect.left - 1 && emblemRect.right <= gridRect.right + 1 &&
        emblemRect.top >= gridRect.top - 1 && emblemRect.bottom <= gridRect.bottom + 1);
      const mobileMastheadAligned = Boolean(emblemRect && wordmarkRect && taglineRect &&
        Math.abs(emblemRect.top - wordmarkRect.top) <= 10 &&
        emblemRect.bottom <= taglineRect.bottom + 12);
      const desktopRightAnchor = Boolean(emblemRect && headingRect && navRect && metaRect &&
        emblemRect.left > headingRect.left &&
        emblemRect.left > navRect.left &&
        emblemRect.left > metaRect.left);
      const contentDoesNotOverlapEmblem = Boolean(emblemRect && [wordmarkRect, taglineRect, headingRect, navRect, metaRect]
        .filter(Boolean)
        .every((rect) => rect.right <= emblemRect.left + 1 || rect.top >= emblemRect.bottom - 1 || rect.bottom <= emblemRect.top + 1));

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer ? footer.scrollWidth > footer.clientWidth + 1 : true,
        emblemPresent: Boolean(emblem),
        emblemLoaded: emblem instanceof HTMLImageElement ? emblem.complete && emblem.naturalWidth > 0 : false,
        emblemSrcCorrect: emblem instanceof HTMLImageElement ? emblem.src.includes('assets_work_808-emblem.opt.webp') : false,
        emblemDecorative: emblem instanceof HTMLImageElement ? emblem.alt === '' && emblem.getAttribute('aria-hidden') === 'true' : false,
        emblemPosition: emblemStyle?.position || null,
        emblemWidth: emblemRect?.width || 0,
        emblemHeight: emblemRect?.height || 0,
        insideGrid,
        gridColumns,
        mobileMastheadAligned,
        desktopRightAnchor,
        contentDoesNotOverlapEmblem,
        imageFailureCount: imagesFailed.length,
      };
    });

    const isMobile = viewport.width <= 720;
    const sizeMatches = Math.abs(metrics.emblemWidth - viewport.expectedEmblem) <= 1.5 &&
      Math.abs(metrics.emblemHeight - viewport.expectedEmblem) <= 1.5;
    const checks = [
      ['no page overflow', !metrics.pageOverflow],
      ['no footer overflow', !metrics.footerOverflow],
      ['footer emblem present and loaded', metrics.emblemPresent && metrics.emblemLoaded],
      ['footer emblem uses approved asset', metrics.emblemSrcCorrect],
      ['footer emblem remains decorative', metrics.emblemDecorative],
      ['footer emblem is structural, not absolutely positioned', metrics.emblemPosition !== 'absolute'],
      ['footer emblem matches governed responsive size', sizeMatches],
      ['footer emblem remains inside footer grid', metrics.insideGrid],
      ['footer grid uses governed responsive column count', metrics.gridColumns === viewport.expectedColumns],
      ['footer content does not overlap emblem', metrics.contentDoesNotOverlapEmblem],
      ['footer identity composition is aligned', isMobile ? metrics.mobileMastheadAligned : metrics.desktopRightAnchor],
      ['all site images loaded', metrics.imageFailureCount === 0],
    ];

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, expectedEmblem: viewport.expectedEmblem, metrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'footer-signature-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(
  path.join(outputDir, 'FOOTER-SIGNATURE-README.md'),
  `# Señor 808 Footer Signature Anchor QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  'utf8',
);

if (failures.length > 0) throw new Error(`Footer signature anchor QA failed:\n${failures.join('\n')}`);
