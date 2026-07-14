import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = path.resolve('artifacts/responsive-qa');

const viewports = [
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const findings = [];

async function preparePage(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      .reveal-on-scroll {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });

  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });

    const step = Math.max(280, Math.floor(window.innerHeight * 0.65));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 90));
    }

    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));

    await Promise.all(
      Array.from(document.images).map((image) =>
        image.complete ? image.decode().catch(() => undefined) : new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }),
      ),
    );
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(250);
}

async function isolateSectionCapture(page) {
  await page.addStyleTag({
    content: `
      .site-header,
      .scroll-progress-container,
      .skip-link,
      .back-to-top {
        display: none !important;
      }
    `,
  });
}

async function captureFullPage(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await preparePage(page);

  const layout = await page.evaluate(() => {
    const images = Array.from(document.images);
    const failedImages = images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || image.alt || 'Unknown image');

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      imageCount: images.length,
      loadedImageCount: images.length - failedImages.length,
      failedImages,
    };
  });

  findings.push({ viewport: viewport.name, ...layout });

  await page.screenshot({
    path: path.join(outputDir, `${viewport.name}-full-page.png`),
    fullPage: true,
  });

  await context.close();
}

async function captureMobileMenu() {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await preparePage(page);
  await page.locator('.mobile-toggle').click();
  await page.screenshot({ path: path.join(outputDir, 'mobile-360-navigation-open.png') });
  await context.close();
}

async function captureWorkStates() {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  await preparePage(page);

  const workSection = page.locator('#work');
  await workSection.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Mixed Media' }).click();
  await page.waitForTimeout(350);
  await isolateSectionCapture(page);
  await workSection.screenshot({ path: path.join(outputDir, 'tablet-768-work-filter-mixed-media.png') });

  const firstWorkCard = page.locator('.work-card:not(.skeleton-card)').first();
  await firstWorkCard.click();
  await page.screenshot({ path: path.join(outputDir, 'tablet-768-artwork-lightbox.png') });

  await context.close();
}

async function captureInquiryStates() {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  await preparePage(page);

  const inquirySection = page.locator('#start-project');
  await inquirySection.scrollIntoViewIfNeeded();
  await isolateSectionCapture(page);
  await inquirySection.screenshot({ path: path.join(outputDir, 'tablet-768-inquiry-step-1.png') });

  await page.getByRole('button', { name: 'Commissioned Artwork' }).click();
  await page.locator('input[name="display_name"]').fill('Responsive QA Test');
  await page.locator('input[name="display_email"]').fill('qa@example.com');
  await page.locator('textarea[name="display_details"]').fill('Responsive layout validation for the guided project inquiry form.');
  await inquirySection.screenshot({ path: path.join(outputDir, 'tablet-768-inquiry-step-2.png') });

  await page.getByRole('button', { name: 'Review Inquiry' }).click();
  await inquirySection.screenshot({ path: path.join(outputDir, 'tablet-768-inquiry-step-3.png') });

  await context.close();
}

async function captureFooter() {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
  const page = await context.newPage();
  await preparePage(page);

  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  await isolateSectionCapture(page);
  await footer.screenshot({ path: path.join(outputDir, 'tablet-820-footer.png') });

  await context.close();
}

try {
  for (const viewport of viewports) {
    await captureFullPage(viewport);
  }

  await captureMobileMenu();
  await captureWorkStates();
  await captureInquiryStates();
  await captureFooter();

  const generatedAt = new Date().toISOString();
  const reportLines = [
    '# Señor 808 Responsive QA Capture',
    '',
    `Generated: ${generatedAt}`,
    `Target: ${targetUrl}`,
    '',
    '## Layout And Image Check',
    '',
    '| Viewport | CSS Width | Document Width | Overflow | Images Loaded |',
    '|---|---:|---:|---|---:|',
    ...findings.map((item) =>
      `| ${item.viewport} | ${item.viewportWidth}px | ${item.documentWidth}px | ${item.horizontalOverflow ? 'YES' : 'No'} | ${item.loadedImageCount}/${item.imageCount} |`,
    ),
    '',
    '## Image Failures',
    '',
    ...findings.flatMap((item) =>
      item.failedImages.length > 0
        ? [`- ${item.viewport}: ${item.failedImages.join(', ')}`]
        : [`- ${item.viewport}: None`],
    ),
    '',
    '## Captured States',
    '',
    '- Full-page views at 360, 390, 768, 820, and 1024 CSS pixels',
    '- Mobile navigation open',
    '- Work filter set to Mixed Media',
    '- Artwork lightbox open',
    '- Guided inquiry steps 1, 2, and 3',
    '- Tablet footer layout',
    '',
    'Review these images manually before establishing any visual-regression baseline.',
    '',
  ];

  await fs.writeFile(path.join(outputDir, 'README.md'), reportLines.join('\n'), 'utf8');
  await fs.writeFile(path.join(outputDir, 'layout-findings.json'), JSON.stringify(findings, null, 2), 'utf8');
} finally {
  await browser.close();
}
