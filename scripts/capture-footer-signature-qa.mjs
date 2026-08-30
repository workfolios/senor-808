import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');
const viewports = [
  { name: 'mobile-360', width: 360, height: 740, expectedColumns: 1, socialSize: 44, maxFooterHeight: 190, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, expectedColumns: 1, socialSize: 44, maxFooterHeight: 190, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, expectedColumns: 3, socialSize: 44, maxFooterHeight: 150, mobile: false },
  { name: 'tablet-820', width: 820, height: 1180, expectedColumns: 3, socialSize: 44, maxFooterHeight: 150, mobile: false },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, expectedColumns: 3, socialSize: 40, maxFooterHeight: 140, mobile: false },
  { name: 'desktop-1280', width: 1280, height: 900, expectedColumns: 3, socialSize: 40, maxFooterHeight: 140, mobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, expectedColumns: 3, socialSize: 40, maxFooterHeight: 140, mobile: false },
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
    await footer.screenshot({ path: path.join(outputDir, `${viewport.name}-footer-v4.png`) });

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const grid = document.querySelector('.site-footer .footer-grid');
      const brand = document.querySelector('.site-footer .footer-brand');
      const wordmark = document.querySelector('.site-footer .footer-brand img');
      const tagline = document.querySelector('.site-footer .footer-tagline');
      const meta = document.querySelector('.site-footer .footer-meta');
      const socials = document.querySelector('.site-footer .footer-socials');
      const socialBadges = Array.from(document.querySelectorAll('.site-footer .footer-socials .social-badge'));
      const copyright = document.querySelector('.site-footer .footer-copyright');
      const footerNavigation = document.querySelector('.site-footer nav[aria-label="Footer navigation"]');
      const exploreHeading = document.querySelector('.site-footer .footer-heading');
      const footerButtons = Array.from(document.querySelectorAll('.site-footer .footer-btn'));
      const footerActions = document.querySelector('.site-footer .footer-actions');
      const emblem = document.querySelector('.footer-signature-emblem');

      const footerRect = footer?.getBoundingClientRect();
      const gridRect = grid?.getBoundingClientRect();
      const brandRect = brand?.getBoundingClientRect();
      const metaRect = meta?.getBoundingClientRect();
      const socialsRect = socials?.getBoundingClientRect();
      const copyrightRect = copyright?.getBoundingClientRect();
      const socialRects = socialBadges.map((element) => element.getBoundingClientRect());
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const gridColumns = gridStyle?.gridTemplateColumns
        ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;

      const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim();
      const colorProbe = document.createElement('span');
      colorProbe.style.color = accent2;
      document.body.append(colorProbe);
      const accent2Computed = getComputedStyle(colorProbe).color;
      colorProbe.remove();
      const taglineColor = tagline ? getComputedStyle(tagline).color : '';

      const imagesFailed = Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0);
      const contentRects = [brandRect, metaRect, socialsRect, copyrightRect]
        .filter((rect) => Boolean(rect && (rect.width > 0 || rect.height > 0)));
      const contentInsideFooter = contentRects.every((rect) => Boolean(
        footerRect && rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1 &&
        rect.top >= footerRect.top - 1 && rect.bottom <= footerRect.bottom + 1
      ));

      const socialSizes = socialRects.map((rect) => ({ width: rect.width, height: rect.height }));
      const socialVisibleText = socialBadges.map((element) => element.textContent?.trim() || '');
      const socialTooltips = socialBadges.map((element) => element.getAttribute('data-tooltip') || '');
      const socialAriaLabels = socialBadges.map((element) => element.getAttribute('aria-label') || '');
      const socialRowAligned = socialRects.length === 2 && Math.abs(socialRects[0].top - socialRects[1].top) <= 2;
      const copyrightRightAligned = Boolean(gridRect && copyrightRect && Math.abs(gridRect.right - copyrightRect.right) <= 3);
      const desktopSingleRowAligned = Boolean(brandRect && socialsRect && copyrightRect && Math.max(
        Math.abs((brandRect.top + brandRect.height / 2) - (socialsRect.top + socialsRect.height / 2)),
        Math.abs((brandRect.top + brandRect.height / 2) - (copyrightRect.top + copyrightRect.height / 2))
      ) <= 18);
      const mobileOrder = Boolean(brandRect && metaRect && brandRect.bottom < metaRect.top);
      const mobileMetaAligned = Boolean(socialsRect && copyrightRect && Math.abs(
        (socialsRect.top + socialsRect.height / 2) - (copyrightRect.top + copyrightRect.height / 2)
      ) <= 10);

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer ? footer.scrollWidth > footer.clientWidth + 1 : true,
        footerHeight: footerRect?.height || 0,
        emblemAbsent: !emblem,
        footerNavigationAbsent: !footerNavigation,
        exploreHeadingAbsent: !exploreHeading,
        footerCtasAbsent: footerButtons.length === 0 && !footerActions,
        footerMinimalSignoffReady: footer?.getAttribute('data-footer-minimal-signoff') === 'ready',
        gridColumns,
        contentInsideFooter,
        wordmarkIsApprovedWhiteAsset: Boolean(wordmark?.getAttribute('src')?.includes('Senor808_Wordmark_Primary_White.svg')),
        taglineUsesAccent2: taglineColor === accent2Computed,
        socialCount: socialBadges.length,
        socialSizes,
        socialVisibleText,
        socialTooltips,
        socialAriaLabels,
        socialRowAligned,
        copyrightRightAligned,
        desktopSingleRowAligned,
        mobileOrder,
        mobileMetaAligned,
        imageFailureCount: imagesFailed.length,
      };
    });

    const socialSizesCorrect = metrics.socialSizes.length === 2 && metrics.socialSizes.every((size) =>
      Math.abs(size.width - viewport.socialSize) <= 1 && Math.abs(size.height - viewport.socialSize) <= 1
    );
    const iconOnlyContractCorrect = metrics.socialCount === 2 &&
      metrics.socialVisibleText.every((text) => text === '') &&
      metrics.socialTooltips[0] === 'Instagram' && metrics.socialTooltips[1] === 'Threads' &&
      metrics.socialAriaLabels[0].includes('Instagram') && metrics.socialAriaLabels[1].includes('Threads');

    const firstSocial = page.locator('.site-footer .footer-socials .social-badge').first();
    await firstSocial.hover();
    const tooltipVisibleOnHover = await firstSocial.evaluate((element) => {
      const style = getComputedStyle(element, '::after');
      return style.opacity === '1' && style.visibility === 'visible';
    });

    const checks = [
      ['no page overflow', !metrics.pageOverflow],
      ['no footer overflow', !metrics.footerOverflow],
      ['footer footprint stays compact', metrics.footerHeight <= viewport.maxFooterHeight],
      ['footer emblem absent', metrics.emblemAbsent],
      ['duplicated Explore navigation remains removed', metrics.footerNavigationAbsent && metrics.exploreHeadingAbsent],
      ['footer CTA buttons are absent', metrics.footerCtasAbsent],
      ['Footer v4 minimal sign-off initialized', metrics.footerMinimalSignoffReady],
      ['footer uses governed v4 column count', metrics.gridColumns === viewport.expectedColumns],
      ['footer content remains contained', metrics.contentInsideFooter],
      ['approved white Señor 808 wordmark remains in use', metrics.wordmarkIsApprovedWhiteAsset],
      ['descriptor uses bright pink accent token', metrics.taglineUsesAccent2],
      ['social controls are icon-only with accessible names and tooltip labels', iconOnlyContractCorrect],
      ['social controls use governed responsive dimensions', socialSizesCorrect],
      ['social controls stay on one row', metrics.socialRowAligned],
      ['social tooltip appears on hover', tooltipVisibleOnHover],
      ['all site images loaded', metrics.imageFailureCount === 0],
    ];

    if (viewport.mobile) {
      checks.push(['mobile footer reads identity then utility row', metrics.mobileOrder]);
      checks.push(['mobile social/copyright utility row aligns', metrics.mobileMetaAligned]);
    } else {
      checks.push(['identity, socials, and copyright form one optical row', metrics.desktopSingleRowAligned]);
      checks.push(['copyright anchors to right edge', metrics.copyrightRightAligned]);
    }

    checks.filter(([, passed]) => !passed).forEach(([label]) => failures.push(`${viewport.name}: ${label}`));
    findings.push({ viewport: viewport.name, metrics, checks: Object.fromEntries(checks) });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, 'footer-v4-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await fs.writeFile(
  path.join(outputDir, 'FOOTER-V4-README.md'),
  `# Señor 808 Footer v4.0 Minimal Studio Sign-Off QA\n\nTarget: ${targetUrl}\n\nResult: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  'utf8',
);

if (failures.length > 0) throw new Error(`Footer v4.0 QA failed:\n${failures.join('\n')}`);
