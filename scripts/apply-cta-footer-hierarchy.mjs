import fs from 'node:fs';

const appPath = 'src/App.tsx';
const cssPath = 'src/responsive-polish.css';

const replaceOnce = (source, search, replacement, label) => {
  const first = source.indexOf(search);
  if (first === -1) throw new Error(`Missing expected source for ${label}`);
  if (source.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Expected one match for ${label}, found multiple`);
  }
  return source.replace(search, replacement);
};

let app = fs.readFileSync(appPath, 'utf8');

app = replaceOnce(
  app,
  '              <a href="#faq" className={`nav-secondary-link ${activeSection === \'faq\' ? \'active\' : \'\'}`} onClick={handleNavClick}>Process &amp; Availability</a>\n',
  '',
  'mobile-only Process & Availability navigation link'
);

app = replaceOnce(
  app,
  '                <a className="btn" href="#work">View Work</a>',
  '                <a className="btn" href="#work">View Selected Work</a>',
  'hero Selected Work CTA label'
);

app = replaceOnce(
  app,
  '            <h4>Explore</h4>',
  '            <h2 className="footer-heading">Explore</h2>',
  'footer Explore semantic heading'
);

app = replaceOnce(
  app,
  '              <a href="#faq" onClick={handleNavClick}>Process &amp; Availability</a>\n',
  '',
  'footer Process & Availability navigation link'
);

fs.writeFileSync(appPath, app, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Final footer hierarchy and one-primary CTA system. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.nav-cta {\n  border-color: var(--accent);\n  background: transparent;\n  color: var(--text);\n  box-shadow: none;\n}\n\n.nav-cta:hover,\n.nav-cta:focus-visible {\n  border-color: var(--accent-2);\n  background: rgba(216, 27, 96, 0.12);\n  color: var(--text);\n  box-shadow: 0 10px 28px rgba(216, 27, 96, 0.14);\n}\n\n.footer-tagline {\n  color: var(--muted);\n  font-size: clamp(1.05rem, 1.55vw, 1.25rem);\n  font-weight: 500;\n  line-height: 1.42;\n  letter-spacing: -0.018em;\n}\n\n.footer-heading {\n  max-width: none;\n  margin: 0 0 18px;\n  color: var(--text);\n  font-family: var(--font-heading);\n  font-size: clamp(1.16rem, 1.7vw, 1.34rem);\n  font-weight: 700;\n  line-height: 1.2;\n  letter-spacing: -0.022em;\n}\n\n.footer-btn {\n  background: transparent;\n  box-shadow: none;\n}\n\n.footer-btn:hover,\n.footer-btn:focus-visible {\n  border-color: var(--accent-2);\n  background: rgba(216, 27, 96, 0.12);\n  color: var(--text) !important;\n  box-shadow: 0 10px 28px rgba(216, 27, 96, 0.14);\n  transform: translateY(-2px);\n}\n`;
}

fs.writeFileSync(cssPath, css, 'utf8');

console.log('Applied refined footer hierarchy, mirrored navigation, and one-primary CTA system.');
