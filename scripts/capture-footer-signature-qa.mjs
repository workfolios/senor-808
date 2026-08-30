import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedColumns: 1, expectedNavColumns: 1, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, expectedColumns: 1, expectedNavColumns: 1, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, expectedColumns: 3, expectedNavColumns: 2, mobile: false },
  { name: 'tablet-820', width: 820, height: 1180, expectedColumns: 3, expectedNavColumns: 2, mobile: false },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedColumns: 3, expectedNavColumns: 2, mobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, expectedColumns: 3, expectedNavColumns: 2, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, expectedColumns: 3, expectedNavColumns: 2, mobile: false },
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
    await footer.screenshot({ path: path.join(outputDir, `${viewport.name}-footer-v2.png`) });

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const grid = document.querySelector('.site-footer .footer-grid');
      const emblem = document.querySelector('.footer-signature-emblem');
      const wordmark = document.querySelector('.site-footer .footer-brand img');
      const tagline = document.querySelector('.site-footer .footer-tagline');
      const heading = document.querySelector('.site-footer .footer-heading');
      const nav = document.querySelector('.site-footer .footer-links > nav');
      const cta = document.querySelector('.site-footer .footer-btn');
      const socials = document.querySelector('.site-footer .footer-socials');
      const socialBadges = Array.from(document.querySelectorAll('.site-footer .footer-socials .social-badge'));
      const copyright = document.querySelector('.site-footer .footer-copyright');
      const gridRect = grid?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const wordmarkRect = wordmark?.getBoundingClientRect();
      const taglineRect = tagline?.getBoundingClientRect();
      const headingRect = heading?.getBoundingClientRect();
      const navRect = nav?.getBoundingClientRect();
      const ctaRect = cta?.getBoundingClientRect();
      const socialsRect = socials?.getBoundingClientRect();
      const copyrightRect = copyright?.getBoundingClientRect();
      const socialRects = socialBadges.map((element) => element.getBoundingClientRect());
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const navStyle = nav ? getComputedStyle(nav) : null;
      const gridColumns = gridStyle?.gridTemplateColumns
        ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
      const navColumns = navStyle?.gridTemplateColumns
        ? navStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
      const imagesFailed = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
      const contentRects = [wordmarkRect, taglineRect, headingRect, navRect, ctaRect, socialsRect, copyrightRect].filter(Boolean);
      const contentInsideFooter = contentRects.every((rect) => Boolean(
        footerRect && rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1 &&
        rect.top >= footerRect.top - 1 && rect.bottom <= footerRect.bottom + 1
      ));
      const utilityCenters = [ctaRect, socialsRect, copyrightRect]
        .filter(Boolean)
        .map((rect) => rect.top + rect.height / 2);
      const utilityRowAligned = utilityCenters.length === 3 && Math.max(...utilityCenters) - Math.min(...utilityCenters) <= 10;
      const copyrightRightAligned = Boolean(gridRect && copyrightRect && Math.abs(gridRect.right - copyrightRect.right) <= 3);
      const upperTierAligned = Boolean(wordmarkRect && headingRect && Math.abs(wordmarkRect.top - headingRect.top) <= 12);
      const utilityLeftToRight = Boolean(ctaRect && socialsRect && copyrightRect &&
        ctaRect.right < socialsRect.left && socialsRect.right < copyrightRect.left);
      const mobileOrder = Boolean(wordmarkRect && taglineRect && headingRect && navRect && ctaRect && socialsRect && copyrightRect &&
        wordmarkRect.top < taglineRect.top && taglineRect.bottom < headingRect.top && headingRect.bottom <= navRect.top + 2 &&
        navRect.bottom < ctaRect.top && ctaRect.bottom < socialsRect.top && socialsRect.bottom < copyrightRect.top);
      const socialRowAligned = socialRects.length === 2 && Math.abs(socialRects[0].top - socialRects[1].top) <= 2;

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer ? footer.scrollWidth > footer.clientWidth + 1 : true,
        emblemAbsent: !emblem,
        gridColumns,
        navColumns,
        contentInsideFooter,
        utilityRowAligned,
        copyrightRightAligned,
        upperTierAligned,
        utilityLeftToRight,
        mobileOrder,
        socialRowAligned,
        imageFailureCount: imagesFailed.length,
      };
    });

    const checks = [
      ['no page overflow', !metrics.pageOverflow],
      ['no footer overflow', !metrics.footerOverflow],
      ['footer emblem absent', metrics.emblemAbsent],
      ['footer uses governed v2 column count', metrics.gridColumns === viewport.expectedColumns],
      ['Explore navigation uses governed column count', metrics.navColumns === viewport.expectedNavColumns],
      ['footer content remains contained', metrics.contentInsideFooter],
      ['social controls stay on one row', metrics.socialRowAligned],
      ['all site images loaded', metrics.imageFailureCount === 0],
    ];

    if (viewport.mobile) {
      checks.push(['mobile footer follows editorial reading order', metrics.mobileOrder]);
    } else {
      checks.push(['identity and Explore headings align in upper tier', metrics.upperTierAligned]);
      checks.push(['utility rail is vertically aligned', metrics.utilityRowAligned]);
      checks.push(['utility rail reads left to right', metrics.utilityLeftToRight]);
      checks.push(['copyright anchors to right edge', metrics.copyrightRightAligned]);
    }

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, metrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'footer-v2-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(
  path.join(outputDir, 'FOOTER-V2-README.md'),
  `# Señor 808 Footer v2.0 Editorial Layout QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  'utf8',
);

if (failures.length > 0) throw new Error(`Footer v2.0 QA failed:\n${failures.join('\n')}`);
