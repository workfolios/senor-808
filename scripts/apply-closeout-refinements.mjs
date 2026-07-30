import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

const replaceExact = (content, from, to, label, expected = 1) => {
  const count = content.split(from).length - 1;
  if (count !== expected) {
    throw new Error(`${label}: expected ${expected} match(es), found ${count}`);
  }
  return content.split(from).join(to);
};

const appPath = 'src/App.tsx';
let app = read(appPath);
app = replaceExact(
  app,
  '<h1 id="hero-title">Visual Art And Audio Storytelling</h1>',
  '<h1 id="hero-title">Visual Artist &amp; Audio Storyteller</h1>',
  'Hero heading'
);
app = replaceExact(
  app,
  '<p className="lead">Bob Garcia, known professionally as Señor 808, is a San Antonio-based visual artist building high-contrast work through spray paint, acrylic layering, and mixed-media mark-making.</p>',
  '<p className="lead">Building high-contrast work through spray paint, acrylic layering, and mixed-media mark-making.</p>',
  'Hero supporting copy'
);
write(appPath, app);

const htmlPath = 'index.html';
let html = read(htmlPath);

const mainDescription = 'Explore high-contrast mixed-media art by San Antonio artist Bob Garcia, known as Señor 808, including commissions, live painting, and developing audio storytelling.';
const socialDescription = 'Explore high-contrast mixed-media art by Bob Garcia, known as Señor 808: commissions, live painting, and developing audio storytelling.';

html = replaceExact(
  html,
  'content="Explore high-contrast visual art by San Antonio artist Bob Garcia, known professionally as Señor 808, Senor 808, and The Real Señor 808."',
  `content="${mainDescription}"`,
  'Primary meta description'
);
html = replaceExact(
  html,
  'content="Explore high-contrast visual art by Bob Garcia, known professionally as Señor 808 and The Real Señor 808."',
  `content="${socialDescription}"`,
  'Social descriptions',
  2
);
html = replaceExact(
  html,
  '    <meta name="author" content="Bob Garcia" />',
  `    <meta name="author" content="Bob Garcia" />\n    <meta name="application-name" content="Señor 808" />\n    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n    <meta name="theme-color" content="#0B0F14" />\n    <meta name="color-scheme" content="dark" />`,
  'Core metadata insertion'
);
html = replaceExact(
  html,
  '    <link rel="canonical" href="https://workfolios.github.io/senor-808/" />',
  `    <link rel="canonical" href="https://workfolios.github.io/senor-808/" />\n    <link rel="alternate" hreflang="en-US" href="https://workfolios.github.io/senor-808/" />\n    <link rel="alternate" hreflang="x-default" href="https://workfolios.github.io/senor-808/" />`,
  'Canonical and language links'
);
html = replaceExact(
  html,
  '    <meta property="og:type" content="website" />',
  `    <meta property="og:type" content="website" />\n    <meta property="og:locale" content="en_US" />`,
  'Open Graph locale'
);
html = replaceExact(
  html,
  '    <meta property="og:image" content="https://workfolios.github.io/senor-808/assets/hero/assets_hero_hero-v1.png" />',
  `    <meta property="og:image" content="https://workfolios.github.io/senor-808/assets/hero/assets_hero_hero-v1.png" />\n    <meta property="og:image:secure_url" content="https://workfolios.github.io/senor-808/assets/hero/assets_hero_hero-v1.png" />\n    <meta property="og:image:type" content="image/png" />`,
  'Open Graph image metadata'
);

const jsonLd = `    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://workfolios.github.io/senor-808/#website",
            "url": "https://workfolios.github.io/senor-808/",
            "name": "Señor 808",
            "alternateName": [
              "Bob Garcia Art Portfolio",
              "The Real Señor 808"
            ],
            "description": "${mainDescription}",
            "inLanguage": "en-US",
            "publisher": {
              "@id": "https://workfolios.github.io/senor-808/#person"
            }
          },
          {
            "@type": "Person",
            "@id": "https://workfolios.github.io/senor-808/#person",
            "name": "Bob Garcia",
            "alternateName": [
              "Señor 808",
              "Senor 808",
              "The Real Señor 808",
              "The Real Senor 808"
            ],
            "url": "https://workfolios.github.io/senor-808/",
            "mainEntityOfPage": {
              "@id": "https://workfolios.github.io/senor-808/#website"
            },
            "image": "https://workfolios.github.io/senor-808/assets/headshots/assets_headshots_headshot-01.png",
            "description": "San Antonio visual artist creating high-contrast mixed-media work, commissions, and live painting, with audio storytelling in development.",
            "homeLocation": {
              "@type": "Place",
              "name": "San Antonio, Texas"
            },
            "jobTitle": "Visual Artist",
            "knowsAbout": [
              "Visual art",
              "Mixed-media art",
              "Spray paint",
              "Acrylic painting",
              "Portraiture",
              "Typography",
              "Geometric abstraction",
              "Live painting"
            ]
          }
        ]
      }
    </script>`;

const jsonLdPattern = /    <script type="application\/ld\+json">[\s\S]*?    <\/script>/;
const jsonLdMatches = html.match(new RegExp(jsonLdPattern.source, 'g')) || [];
if (jsonLdMatches.length !== 1) {
  throw new Error(`JSON-LD block: expected 1 match, found ${jsonLdMatches.length}`);
}
html = html.replace(jsonLdPattern, jsonLd);
write(htmlPath, html);

const readmePath = 'README.md';
let readme = read(readmePath);
readme = replaceExact(
  readme,
  'A one-page artist portfolio website for Señor 808, built to present visual artwork, selected collaboration formats, and a developing media direction through proof-honest public content.',
  'A one-page portfolio for San Antonio visual artist Bob Garcia, known as Señor 808, featuring high-contrast mixed-media work, commissions, live painting, and a developing audio-storytelling lane.',
  'README introduction'
);
readme = replaceExact(
  readme,
  '## Tech Stack',
  `## Repository About Metadata\n\n- **Description:** Artist portfolio for Bob Garcia / Señor 808 — high-contrast mixed-media visual art, commissions, live painting, and developing audio storytelling.\n- **Website:** https://workfolios.github.io/senor-808/\n- **Topics:** artist-portfolio, visual-art, mixed-media, react, vite, typescript, github-pages, responsive-design, accessibility, formspree\n\n## Tech Stack`,
  'README repository metadata section'
);
write(readmePath, readme);

const packagePath = 'package.json';
const packageJson = JSON.parse(read(packagePath));
packageJson.scripts = {
  dev: packageJson.scripts.dev,
  build: packageJson.scripts.build,
  preview: packageJson.scripts.preview,
  clean: packageJson.scripts.clean,
  lint: packageJson.scripts.lint,
  'validate:seo': 'node scripts/validate-seo.mjs',
  'optimize-images': packageJson.scripts['optimize-images']
};
write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const deployPath = '.github/workflows/deploy.yml';
let deploy = read(deployPath);
deploy = replaceExact(
  deploy,
  `      - name: TypeScript Check\n        run: npm run lint\n\n      - name: Build Site`,
  `      - name: TypeScript Check\n        run: npm run lint\n\n      - name: SEO Metadata Check\n        run: npm run validate:seo\n\n      - name: Build Site`,
  'Deployment SEO validation step'
);
write(deployPath, deploy);

const validator = `import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const fail = (message) => {
  console.error(\`SEO validation failed: \${message}\`);
  process.exitCode = 1;
};

const requirePattern = (pattern, label) => {
  if (!pattern.test(html)) fail(\`missing or invalid \${label}\`);
};

requirePattern(/<title>[^<]{30,65}<\\/title>/, 'page title');
requirePattern(/<meta\\s+name="description"\\s+content="[^"]{120,170}"\\s*\\/>/, 'meta description');
requirePattern(/<meta\\s+name="robots"\\s+content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"\\s*\\/>/, 'robots meta tag');
requirePattern(/<link\\s+rel="canonical"\\s+href="https:\\/\\/workfolios\\.github\\.io\\/senor-808\\/"\\s*\\/>/, 'canonical URL');
requirePattern(/<meta\\s+property="og:title"\\s+content="[^"]+"\\s*\\/>/, 'Open Graph title');
requirePattern(/<meta\\s+property="og:description"\\s+content="[^"]+"\\s*\\/>/, 'Open Graph description');
requirePattern(/<meta\\s+property="og:url"\\s+content="https:\\/\\/workfolios\\.github\\.io\\/senor-808\\/"\\s*\\/>/, 'Open Graph URL');
requirePattern(/<meta\\s+property="og:image"\\s+content="https:\\/\\/workfolios\\.github\\.io\\/senor-808\\/[^"]+"\\s*\\/>/, 'Open Graph image');
requirePattern(/<meta\\s+name="twitter:card"\\s+content="summary_large_image"\\s*\\/>/, 'Twitter card type');
requirePattern(/<meta\\s+name="twitter:title"\\s+content="[^"]+"\\s*\\/>/, 'Twitter title');
requirePattern(/<meta\\s+name="twitter:description"\\s+content="[^"]+"\\s*\\/>/, 'Twitter description');
requirePattern(/<meta\\s+name="twitter:image"\\s+content="https:\\/\\/workfolios\\.github\\.io\\/senor-808\\/[^"]+"\\s*\\/>/, 'Twitter image');

const jsonLdMatch = html.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/);
if (!jsonLdMatch) {
  fail('JSON-LD block');
} else {
  try {
    const data = JSON.parse(jsonLdMatch[1]);
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    if (!graph.some((node) => node['@type'] === 'WebSite')) fail('WebSite structured data');
    if (!graph.some((node) => node['@type'] === 'Person')) fail('Person structured data');
  } catch (error) {
    fail(\`parseable JSON-LD (\${error.message})\`);
  }
}

for (const path of ['public/robots.txt', 'public/sitemap.xml']) {
  if (!fs.existsSync(path)) fail(\`required discovery file \${path}\`);
}

if (!process.exitCode) {
  console.log('SEO metadata validation passed.');
}
`;
write('scripts/validate-seo.mjs', validator);

console.log('Closeout SEO and hero refinements applied successfully.');
