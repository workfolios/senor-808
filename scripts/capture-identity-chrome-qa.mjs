import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/gallery-refinement-qa');

const viewports = [
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
];

const expected = {
  title: 'High-Contrast Visual Art',
  lead: 'Spray paint, acrylic layering, and mixed-media mark-making—moving between portraiture, typography, and geometry.',
  media: 'Image meets voice through a developing audio storytelling practice.',
  footer: 'Image Meets Voice.',
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const findings = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const failures = [];
    page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => failures.push(`requestfailed: ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`));

    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForFunction(() => document.documentElement.dataset.identityChromeV2 === 'ready');

    const heroState = await page.evaluate(() => {
      const hero = document.querySelector('#home.hero');
      const title = hero?.querySelector('h1');
      const lead = hero?.querySelector('.lead');
      const media = hero?.querySelector('.hero-media-note');
      const heroRect = hero?.getBoundingClientRect();
      const header = document.querySelector('.site-header');
      return {
        title: title?.textContent?.trim() || '',
        lead: lead?.textContent?.trim() || '',
        media: media?.textContent?.trim() || '',
        heroHeight: heroRect?.height || 0,
        headerHeight: header?.getBoundingClientRect().height || 0,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    assert(heroState.title === expected.title, `${viewport.name}: hero title mismatch: ${heroState.title}`);
    assert(heroState.lead === expected.lead, `${viewport.name}: hero lead mismatch`);
    assert(heroState.media === expected.media, `${viewport.name}: developing-media line mismatch`);
    assert(!heroState.pageOverflow, `${viewport.name}: horizontal page overflow detected`);
    if (viewport.width <= 640) {
      assert(heroState.heroHeight <= 765, `${viewport.name}: mobile hero remains excessively tall (${heroState.heroHeight}px)`);
      assert(heroState.heroHeight >= 590, `${viewport.name}: mobile hero compressed too far (${heroState.heroHeight}px)`);
      assert(Math.abs(heroState.headerHeight - 54) <= 2, `${viewport.name}: compact header is not 54px (${heroState.headerHeight}px)`);
    }

    await page.locator('#home.hero').screenshot({ path: path.join(outputDir, `${viewport.name}-hero-v2.png`) });

    let navState = null;
    if (viewport.width <= 920) {
      const toggle = page.locator('.mobile-toggle');
      await toggle.click();
      await page.waitForTimeout(120);
      navState = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const drawer = document.querySelector('.nav-links.open');
        const toggleButton = document.querySelector('.mobile-toggle');
        const headerRect = header?.getBoundingClientRect();
        const drawerRect = drawer?.getBoundingClientRect();
        return {
          toggleText: toggleButton?.textContent?.trim() || '',
          expanded: toggleButton?.getAttribute('aria-expanded'),
          headerBottom: headerRect?.bottom || 0,
          drawerTop: drawerRect?.top || 0,
          drawerLeft: drawerRect?.left || 0,
          drawerRight: drawerRect?.right || 0,
          bodyOverflow: getComputedStyle(document.body).overflow,
        };
      });
      assert(navState.toggleText === 'Close', `${viewport.name}: open menu control does not read Close`);
      assert(navState.expanded === 'true', `${viewport.name}: menu aria-expanded is not true`);
      assert(Math.abs(navState.headerBottom - navState.drawerTop) <= 2, `${viewport.name}: drawer is detached from header`);
      assert(navState.drawerLeft <= 1 && Math.abs(navState.drawerRight - viewport.width) <= 2, `${viewport.name}: drawer is not viewport-wide`);
      assert(navState.bodyOverflow === 'hidden', `${viewport.name}: open drawer does not isolate background scrolling`);
      await page.screenshot({ path: path.join(outputDir, `${viewport.name}-header-v2-open.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      assert((await toggle.textContent())?.trim() === 'Menu', `${viewport.name}: menu label did not restore after Escape`);
    }

    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(140);
    const footerState = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const brand = footer?.querySelector('.footer-brand');
      const tagline = footer?.querySelector('.footer-tagline');
      const socialLabels = Array.from(footer?.querySelectorAll('.footer-social-label') || []).map((node) => node.textContent?.trim() || '');
      const meta = footer?.querySelector('.footer-meta');
      const footerRect = footer?.getBoundingClientRect();
      const brandRect = brand?.getBoundingClientRect();
      const metaRect = meta?.getBoundingClientRect();
      const backToTop = document.querySelector('.back-to-top');
      const backStyles = backToTop ? getComputedStyle(backToTop) : null;
      return {
        tagline: tagline?.textContent?.trim() || '',
        socialLabels,
        footerHeight: footerRect?.height || 0,
        brandTop: brandRect?.top || 0,
        metaTop: metaRect?.top || 0,
        backOpacity: backStyles?.opacity || '',
        backVisibility: backStyles?.visibility || '',
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    assert(footerState.tagline === expected.footer, `${viewport.name}: Footer v6 signature line mismatch`);
    assert(JSON.stringify(footerState.socialLabels) === JSON.stringify(['Instagram', 'Threads']), `${viewport.name}: social micro-labels are not intentional/complete`);
    assert(!footerState.pageOverflow, `${viewport.name}: footer introduced horizontal overflow`);
    if (viewport.width > 720) {
      assert(Math.abs(footerState.brandTop - footerState.metaTop) <= 8, `${viewport.name}: Studio Signature anchors are vertically misaligned`);
      assert(footerState.footerHeight <= 105, `${viewport.name}: footer footprint exceeds 105px (${footerState.footerHeight}px)`);
    } else {
      assert(footerState.footerHeight <= 135, `${viewport.name}: mobile footer footprint exceeds 135px (${footerState.footerHeight}px)`);
    }
    if (viewport.width > 920) {
      assert(footerState.backOpacity === '0' || footerState.backVisibility === 'hidden', `${viewport.name}: Back to Top still competes with footer signature`);
    }

    await page.locator('.site-footer').screenshot({ path: path.join(outputDir, `${viewport.name}-footer-v6.png`) });

    findings.push({ viewport: viewport.name, heroState, navState, footerState, failures });
    assert(failures.length === 0, `${viewport.name}: runtime/network findings: ${failures.join(' | ')}`);
    await page.close();
  }

  await fs.writeFile(path.join(outputDir, 'IDENTITY-CHROME-V2-FINDINGS.json'), JSON.stringify(findings, null, 2));
  await fs.writeFile(
    path.join(outputDir, 'IDENTITY-CHROME-V2-README.md'),
    '# Header v2 + Hero v2 + Footer v6 QA\n\nPASS — Artist-first hero messaging, compact top-drawer navigation, Studio Signature footer, footer-adjacent Back-to-Top suppression, and responsive containment validated across 360/390/768/820/1024/1280/1440px.\n'
  );
} finally {
  await browser.close();
}
