import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedColumns: 1 },
  { name: 'mobile-390', width: 390, height: 844, expectedColumns: 1 },
  { name: 'tablet-768', width: 768, height: 1024, expectedColumns: 2 },
  { name: 'tablet-820', width: 820, height: 1180, expectedColumns: 2 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedColumns: 2 },
  { name: 'desktop-1280', width: 1280, height: 900, expectedColumns: 2 },
  { name: 'desktop-1440', width: 1440, height: 900, expectedColumns: 2 },
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
    await footer.screenshot({ path: path.join(outputDir, `${viewport.name}-footer-no-emblem.png`) });

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const grid = document.querySelector('.site-footer .footer-grid');
      const emblem = document.querySelector('.footer-signature-emblem');
      const wordmark = document.querySelector('.site-footer .footer-brand img');
      const heading = document.querySelector('.site-footer .footer-heading');
      const nav = document.querySelector('.site-footer .footer-links > nav');
      const meta = document.querySelector('.site-footer .footer-meta');
      const cta = document.querySelector('.site-footer .footer-btn');
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const gridColumns = gridStyle?.gridTemplateColumns
        ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
      const imagesFailed = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
      const contentRects = [wordmark, heading, nav, meta, cta]
        .map((element) => element?.getBoundingClientRect())
        .filter(Boolean);
      const contentInsideFooter = contentRects.every((rect) => {
        const footerRect = footer?.getBoundingClientRect();
        return Boolean(footerRect && rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1);
      });

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer ? footer.scrollWidth > footer.clientWidth + 1 : true,
        emblemAbsent: !emblem,
        gridColumns,
        contentInsideFooter,
        imageFailureCount: imagesFailed.length,
      };
    });

    const checks = [
      ['no page overflow', !metrics.pageOverflow],
      ['no footer overflow', !metrics.footerOverflow],
      ['footer emblem absent', metrics.emblemAbsent],
      ['footer restored to governed responsive column count', metrics.gridColumns === viewport.expectedColumns],
      ['footer content remains contained', metrics.contentInsideFooter],
      ['all site images loaded', metrics.imageFailureCount === 0],
    ];

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, metrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'footer-emblem-removal-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(
  path.join(outputDir, 'FOOTER-EMBLEM-REMOVAL-README.md'),
  `# Señor 808 Footer Emblem Removal QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  'utf8',
);

if (failures.length > 0) throw new Error(`Footer emblem removal QA failed:\n${failures.join('\n')}`);
