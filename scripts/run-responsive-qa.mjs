import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:4173/';
const outputDir = 'artifacts/responsive-qa';
const runtimeIssuesPath = `${outputDir}/runtime-issues.json`;
const layoutFindingsPath = `${outputDir}/layout-findings.json`;
const crossBrowserFindingsPath = `${outputDir}/cross-browser-findings.json`;
const providerWarningsPath = `${outputDir}/external-provider-warnings.json`;

const runCapture = () => new Promise((resolve) => {
  const child = spawn(process.execPath, ['scripts/capture-responsive-qa.mjs'], {
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => resolve(code ?? 1));
});

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const isGoogleFontUrl = (url = '') => {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com';
  } catch {
    return false;
  }
};

const isGenericBrowserResourceConsoleError = (issue) =>
  issue.type === 'console-error'
  && /^Failed to load resource: the server responded with a status of \d{3}/.test(issue.message || '');

const verifySameOriginHealth = async () => {
  const target = new URL(targetUrl);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const problems = [];

  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === target.origin && response.status() >= 400) {
      problems.push({
        type: 'same-origin-http-error',
        status: response.status(),
        url: response.url(),
      });
    }
  });

  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.origin === target.origin) {
      problems.push({
        type: 'same-origin-request-failed',
        message: request.failure()?.errorText || 'Unknown request failure',
        url: request.url(),
      });
    }
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('heading', { name: 'Visual Artist & Audio Storyteller' }).waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await page.waitForTimeout(1_500);
  } finally {
    await context.close();
    await browser.close();
  }

  return problems;
};

const captureExitCode = await runCapture();
if (captureExitCode === 0) {
  await fs.writeFile(providerWarningsPath, '[]\n', 'utf8');
  process.exit(0);
}

let runtimeIssues;
let layoutFindings;
let engineFindings;

try {
  [runtimeIssues, layoutFindings, engineFindings] = await Promise.all([
    readJson(runtimeIssuesPath),
    readJson(layoutFindingsPath),
    readJson(crossBrowserFindingsPath),
  ]);
} catch (error) {
  console.error('QA capture failed and its evidence could not be evaluated safely.', error);
  process.exit(captureExitCode);
}

const providerFailures = runtimeIssues.filter(
  (issue) => issue.type === 'request-failed' && isGoogleFontUrl(issue.url),
);
const genericConsoleErrors = runtimeIssues.filter(isGenericBrowserResourceConsoleError);
const otherRuntimeIssues = runtimeIssues.filter(
  (issue) => !providerFailures.includes(issue) && !genericConsoleErrors.includes(issue),
);
const layoutPassed = layoutFindings.every(
  (item) => !item.horizontalOverflow && Array.isArray(item.failedImages) && item.failedImages.length === 0,
);
const enginesPassed = engineFindings.every((item) => item.passed === true);

if (providerFailures.length === 0 || otherRuntimeIssues.length > 0 || !layoutPassed || !enginesPassed) {
  console.error('QA capture failed for a site-owned, layout, image, browser, or non-approved runtime condition.');
  process.exit(captureExitCode);
}

const sameOriginProblems = await verifySameOriginHealth();
if (sameOriginProblems.length > 0) {
  console.error('External font-provider turbulence coincided with a same-origin website failure.', sameOriginProblems);
  process.exit(captureExitCode);
}

const providerWarnings = [
  ...providerFailures.map((issue) => ({
    ...issue,
    disposition: 'external-provider-warning',
    provider: 'Google Fonts',
  })),
  ...genericConsoleErrors.map((issue) => ({
    ...issue,
    disposition: 'associated-browser-console-warning',
    note: 'Accepted only because Google Fonts failed in the same capture and an independent same-origin health check passed.',
  })),
];

await fs.writeFile(providerWarningsPath, `${JSON.stringify(providerWarnings, null, 2)}\n`, 'utf8');
console.warn(
  `Responsive QA passed with ${providerWarnings.length} external Google Fonts/provider warning(s). `
  + 'Layout, images, cross-browser principal flows, and an independent same-origin health check passed.',
);
process.exit(0);
