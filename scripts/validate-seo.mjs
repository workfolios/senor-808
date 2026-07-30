import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const fail = (message) => {
  console.error(`SEO validation failed: ${message}`);
  process.exitCode = 1;
};

const requirePattern = (pattern, label) => {
  if (!pattern.test(html)) fail(`missing or invalid ${label}`);
};

requirePattern(/<title>[^<]{30,65}<\/title>/, 'page title');
requirePattern(/<meta\s+name="description"\s+content="[^"]{120,170}"\s*\/>/, 'meta description');
requirePattern(/<meta\s+name="robots"\s+content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"\s*\/>/, 'robots meta tag');
requirePattern(/<link\s+rel="canonical"\s+href="https:\/\/workfolios\.github\.io\/senor-808\/"\s*\/>/, 'canonical URL');
requirePattern(/<meta\s+property="og:title"\s+content="[^"]+"\s*\/>/, 'Open Graph title');
requirePattern(/<meta\s+property="og:description"\s+content="[^"]+"\s*\/>/, 'Open Graph description');
requirePattern(/<meta\s+property="og:url"\s+content="https:\/\/workfolios\.github\.io\/senor-808\/"\s*\/>/, 'Open Graph URL');
requirePattern(/<meta\s+property="og:image"\s+content="https:\/\/workfolios\.github\.io\/senor-808\/[^"]+"\s*\/>/, 'Open Graph image');
requirePattern(/<meta\s+name="twitter:card"\s+content="summary_large_image"\s*\/>/, 'Twitter card type');
requirePattern(/<meta\s+name="twitter:title"\s+content="[^"]+"\s*\/>/, 'Twitter title');
requirePattern(/<meta\s+name="twitter:description"\s+content="[^"]+"\s*\/>/, 'Twitter description');
requirePattern(/<meta\s+name="twitter:image"\s+content="https:\/\/workfolios\.github\.io\/senor-808\/[^"]+"\s*\/>/, 'Twitter image');

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) {
  fail('JSON-LD block');
} else {
  try {
    const data = JSON.parse(jsonLdMatch[1]);
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    if (!graph.some((node) => node['@type'] === 'WebSite')) fail('WebSite structured data');
    if (!graph.some((node) => node['@type'] === 'Person')) fail('Person structured data');
  } catch (error) {
    fail(`parseable JSON-LD (${error.message})`);
  }
}

for (const path of ['public/robots.txt', 'public/sitemap.xml']) {
  if (!fs.existsSync(path)) fail(`required discovery file ${path}`);
}

if (!process.exitCode) {
  console.log('SEO metadata validation passed.');
}
