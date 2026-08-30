import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedColumns: 1, socialWidth: 100, socialHeight: 44, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, expectedColumns: 1, socialWidth: 104, socialHeight: 44, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, expectedColumns: 2, socialWidth: 104, socialHeight: 44, mobile: false },
  { name: 'tablet-820', width: 820, height: 1180, expectedColumns: 2, socialWidth: 104, socialHeight: 44, mobile: false },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedColumns: 2, socialWidth: 104, socialHeight: 40, mobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, expectedColumns: 2, socialWidth: 108, socialHeight: 40, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, expectedColumns: 2, socialWidth: 108, socialHeight: 40, mobile: false },
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
    await footer.screenshot({ path: path.join(outputDir, `${viewport.name}-footer-v3.png`) });

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const grid = document.querySelector('.site-footer .footer-grid');
      const brand = document.querySelector('.site-footer .footer-brand');
      const actions = document.querySelector('.site-footer .footer-actions');
      const actionLinks = Array.from(document.querySelectorAll('.site-footer .footer-actions .footer-btn'));
      const primary = document.querySelector('.site-footer .footer-btn-primary');
      const secondary = document.querySelector('.site-footer .footer-btn-secondary');
      const footerNavigation = document.querySelector('.site-footer nav[aria-label="Footer navigation"]');
      const exploreHeading = document.querySelector('.site-footer .footer-heading');
      const emblem = document.querySelector('.footer-signature-emblem');
      const meta = document.querySelector('.site-footer .footer-meta');
      const socials = document.querySelector('.site-footer .footer-socials');
      const socialBadges = Array.from(document.querySelectorAll('.site-footer .footer-socials .social-badge'));
      const copyright = document.querySelector('.site-footer .footer-copyright');

      const footerRect = footer?.getBoundingClientRect();
      const gridRect = grid?.getBoundingClientRect();
      const brandRect = brand?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      const metaRect = meta?.getBoundingClientRect();
      const socialsRect = socials?.getBoundingClientRect();
      const copyrightRect = copyright?.getBoundingClientRect();
      const socialRects = socialBadges.map((element) => element.getBoundingClientRect());
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const gridColumns = gridStyle?.gridTemplateColumns
        ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;

      const primaryStyle = primary ? getComputedStyle(primary) : null;
      const secondaryStyle = secondary ? getComputedStyle(secondary) : null;
      const imagesFailed = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
      const contentRects = [brandRect, actionsRect, metaRect, socialsRect, copyrightRect].filter(Boolean);
      const contentInsideFooter = contentRects.every((rect) => Boolean(
        footerRect && rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1 &&
        rect.top >= footerRect.top - 1 && rect.bottom <= footerRect.bottom + 1
      ));

      const actionsText = actionLinks.map((link) => link.textContent?.trim() || '');
      const actionsHref = actionLinks.map((link) => link.getAttribute('href') || '');
      const socialRowAligned = socialRects.length === 2 && Math.abs(socialRects[0].top - socialRects[1].top) <= 2;
      const socialSizes = socialRects.map((rect) => ({ width: rect.width, height: rect.height }));
      const copyrightRightAligned = Boolean(gridRect && copyrightRect && Math.abs(gridRect.right - copyrightRect.right) <= 3);
      const upperTierBalanced = Boolean(brandRect && actionsRect && Math.abs(
        (brandRect.top + brandRect.height / 2) - (actionsRect.top + actionsRect.height / 2)
      ) <= 14);
      const lowerTierBelowUpper = Boolean(brandRect && actionsRect && metaRect &&
        metaRect.top > Math.max(brandRect.bottom, actionsRect.bottom));
      const lowerTierAligned = Boolean(socialsRect && copyrightRect && Math.abs(
        (socialsRect.top + socialsRect.height / 2) - (copyrightRect.top + copyrightRect.height / 2)
      ) <= 10);
      const mobileOrder = Boolean(brandRect && actionsRect && socialsRect && copyrightRect &&
        brandRect.bottom < actionsRect.top && actionsRect.bottom < socialsRect.top && socialsRect.bottom < copyrightRect.top);

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer ? footer.scrollWidth > footer.clientWidth + 1 : true,
        emblemAbsent: !emblem,
        footerNavigationAbsent: !footerNavigation,
        exploreHeadingAbsent: !exploreHeading,
        footerStudioCloseReady: footer?.getAttribute('data-footer-studio-close') === 'ready',
        gridColumns,
        actionCount: actionLinks.length,
        actionsText,
        actionsHref,
        primaryDistinct: Boolean(primaryStyle && secondaryStyle && primaryStyle.backgroundColor !== secondaryStyle.backgroundColor),
        contentInsideFooter,
        socialRowAligned,
        socialSizes,
        copyrightRightAligned,
        upperTierBalanced,
        lowerTierBelowUpper,
        lowerTierAligned,
        mobileOrder,
        imageFailureCount: imagesFailed.length,
      };
    });

    const socialSizesCorrect = metrics.socialSizes.length === 2 && metrics.socialSizes.every((size) =>
      Math.abs(size.width - viewport.socialWidth) <= 1 && Math.abs(size.height - viewport.socialHeight) <= 1
    );
    const actionContractCorrect = metrics.actionCount === 2 &&
      metrics.actionsText[0] === 'Start A Project' && metrics.actionsHref[0] === '#start-project' &&
      metrics.actionsText[1] === 'View Selected Work' && metrics.actionsHref[1] === '#work';

    const checks = [
      ['no page overflow', !metrics.pageOverflow],
      ['no footer overflow', !metrics.footerOverflow],
      ['footer emblem absent', metrics.emblemAbsent],
      ['duplicated Explore navigation removed', metrics.footerNavigationAbsent && metrics.exploreHeadingAbsent],
      ['Footer v3 studio close initialized', metrics.footerStudioCloseReady],
      ['footer uses governed v3 column count', metrics.gridColumns === viewport.expectedColumns],
      ['footer exposes exactly the approved CTA pair', actionContractCorrect],
      ['primary CTA remains visually distinct from secondary CTA', metrics.primaryDistinct],
      ['footer content remains contained', metrics.contentInsideFooter],
      ['social controls stay on one row', metrics.socialRowAligned],
      ['social controls use governed responsive dimensions', socialSizesCorrect],
      ['all site images loaded', metrics.imageFailureCount === 0],
    ];

    if (viewport.mobile) {
      checks.push(['mobile footer follows identity → CTA → social → copyright order', metrics.mobileOrder]);
    } else {
      checks.push(['identity and CTA pair balance in the upper tier', metrics.upperTierBalanced]);
      checks.push(['utility tier sits below the upper tier', metrics.lowerTierBelowUpper]);
      checks.push(['socials and copyright align in the utility tier', metrics.lowerTierAligned]);
      checks.push(['copyright anchors to the right edge', metrics.copyrightRightAligned]);
    }

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, metrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'footer-v3-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(
  path.join(outputDir, 'FOOTER-V3-README.md'),
  `# Señor 808 Footer v3.0 Conversion-Led Studio Close QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  'utf8',
);

if (failures.length > 0) throw new Error(`Footer v3.0 QA failed:\n${failures.join('\n')}`);
