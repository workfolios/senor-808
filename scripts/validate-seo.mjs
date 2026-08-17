import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const appSource = fs.readFileSync('src/App.tsx', 'utf8');
const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
const robots = fs.readFileSync('public/robots.txt', 'utf8');
const thanks = fs.readFileSync('public/thanks.html', 'utf8');
const notFound = fs.readFileSync('public/404.html', 'utf8');
const portfolio = JSON.parse(fs.readFileSync('src/data/portfolio.json', 'utf8'));

const canonicalUrl = 'https://workfolios.github.io/senor-808/';
const fail = (message) => {
  console.error(`SEO validation failed: ${message}`);
  process.exitCode = 1;
};

const extract = (pattern, label) => {
  const match = html.match(pattern);
  if (!match) {
    fail(`missing or invalid ${label}`);
    return '';
  }
  return match[1] || '';
};

const title = extract(/<title>([^<]+)<\/title>/i, 'page title');
if (title.length < 30 || title.length > 65) fail(`page title length ${title.length}; expected 30-65 characters`);
for (const term of ['Señor 808', 'Bob Garcia', 'San Antonio']) {
  if (!title.includes(term)) fail(`page title must include ${term}`);
}

const description = extract(/<meta\s+name="description"\s+content="([^"]+)"\s*\/>/i, 'meta description');
if (description.length < 120 || description.length > 170) {
  fail(`meta description length ${description.length}; expected 120-170 characters`);
}
for (const term of ['San Antonio', 'mixed-media', 'Bob Garcia', 'Señor 808']) {
  if (!description.includes(term)) fail(`meta description must include ${term}`);
}

const robotsMeta = extract(/<meta\s+name="robots"\s+content="([^"]+)"\s*\/>/i, 'robots meta tag');
for (const directive of ['index', 'follow', 'max-image-preview:large']) {
  if (!robotsMeta.includes(directive)) fail(`robots meta tag must include ${directive}`);
}

const canonical = extract(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/>/i, 'canonical URL');
if (canonical !== canonicalUrl) fail(`canonical URL must be ${canonicalUrl}`);

const ogTitle = extract(/<meta\s+property="og:title"\s+content="([^"]+)"\s*\/>/i, 'Open Graph title');
const ogDescription = extract(/<meta\s+property="og:description"\s+content="([^"]+)"\s*\/>/i, 'Open Graph description');
const ogUrl = extract(/<meta\s+property="og:url"\s+content="([^"]+)"\s*\/>/i, 'Open Graph URL');
const ogImage = extract(/<meta\s+property="og:image"\s+content="([^"]+)"\s*\/>/i, 'Open Graph image');
if (ogTitle !== title) fail('Open Graph title must match the page title');
if (ogDescription !== description) fail('Open Graph description must match the meta description');
if (ogUrl !== canonicalUrl) fail('Open Graph URL must match the canonical URL');
if (!ogImage.startsWith(canonicalUrl)) fail('Open Graph image must use the canonical site origin');

const twitterCard = extract(/<meta\s+name="twitter:card"\s+content="([^"]+)"\s*\/>/i, 'Twitter card type');
const twitterTitle = extract(/<meta\s+name="twitter:title"\s+content="([^"]+)"\s*\/>/i, 'Twitter title');
const twitterDescription = extract(/<meta\s+name="twitter:description"\s+content="([^"]+)"\s*\/>/i, 'Twitter description');
const twitterImage = extract(/<meta\s+name="twitter:image"\s+content="([^"]+)"\s*\/>/i, 'Twitter image');
if (twitterCard !== 'summary_large_image') fail('Twitter card must use summary_large_image');
if (twitterTitle !== title) fail('Twitter title must match the page title');
if (twitterDescription !== description) fail('Twitter description must match the meta description');
if (twitterImage !== ogImage) fail('Twitter image must match the Open Graph image');

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (!jsonLdMatch) {
  fail('JSON-LD block');
} else {
  try {
    const data = JSON.parse(jsonLdMatch[1]);
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    const website = graph.find((node) => node['@type'] === 'WebSite');
    const profile = graph.find((node) => node['@type'] === 'ProfilePage');
    const person = graph.find((node) => node['@type'] === 'Person');

    if (!website) fail('WebSite structured data');
    if (!profile) fail('ProfilePage structured data');
    if (!person) fail('Person structured data');

    if (website && website.url !== canonicalUrl) fail('WebSite structured data canonical URL');
    if (profile) {
      if (profile.url !== canonicalUrl) fail('ProfilePage structured data canonical URL');
      if (profile.mainEntity?.['@id'] !== `${canonicalUrl}#person`) fail('ProfilePage mainEntity Person reference');
      if (!profile.primaryImageOfPage) fail('ProfilePage primaryImageOfPage');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dateModified || '')) fail('ProfilePage dateModified');
    }

    if (person) {
      if (person.name !== 'Bob Garcia') fail('Person structured data name');
      if (person.mainEntityOfPage?.['@id'] !== `${canonicalUrl}#profile`) fail('Person mainEntityOfPage ProfilePage reference');
      const sameAs = Array.isArray(person.sameAs) ? person.sameAs : [];
      for (const profileUrl of [
        'https://www.instagram.com/808theartist',
        'https://www.threads.com/@808theartist'
      ]) {
        if (!sameAs.includes(profileUrl)) fail(`Person social profile URL ${profileUrl}`);
      }
    }
  } catch (error) {
    fail(`parseable JSON-LD (${error.message})`);
  }
}

const h1Count = (appSource.match(/<h1\b/gi) || []).length;
if (h1Count !== 1) fail(`rendered application source must contain exactly one h1; found ${h1Count}`);

for (const work of portfolio) {
  if (typeof work.alt !== 'string' || work.alt.trim().length < 20) {
    fail(`portfolio image ${work.img} needs descriptive alt text`);
  }
}

if (!sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) {
  fail('image sitemap namespace');
}
if (!sitemap.includes(`<loc>${canonicalUrl}</loc>`)) fail('canonical homepage in sitemap');
if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) fail('accurate sitemap lastmod date');
if (/<changefreq>|<priority>/.test(sitemap)) fail('sitemap should omit ignored changefreq/priority fields');

const requiredImagePaths = [
  'assets/hero/assets_hero_hero-v1.png',
  'assets/hero/assets_hero_hero-v3.png',
  'assets/headshots/assets_headshots_headshot-01.png',
  ...portfolio.map((work) => work.img.replace(/^\/+/, ''))
];
for (const path of requiredImagePaths) {
  const absoluteImageUrl = `${canonicalUrl}${path}`;
  if (!sitemap.includes(`<image:loc>${absoluteImageUrl}</image:loc>`)) {
    fail(`image sitemap entry ${absoluteImageUrl}`);
  }
}

if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) fail('crawlable robots.txt policy');
if (!robots.includes(`Sitemap: ${canonicalUrl}sitemap.xml`)) fail('robots.txt sitemap declaration');
if (!/<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/>/i.test(thanks)) fail('thanks page noindex policy');
if (!/<meta\s+name="robots"\s+content="noindex"\s*\/>/i.test(notFound)) fail('404 page noindex policy');

if (!process.exitCode) {
  console.log('SEO metadata, structured data, crawl controls, and image discovery validation passed.');
}
