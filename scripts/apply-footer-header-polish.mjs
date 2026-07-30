import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

const replaceOnce = (content, current, replacement, label) => {
  if (content.includes(replacement)) return content;
  if (!content.includes(current)) {
    throw new Error(`Unable to locate ${label}.`);
  }
  return content.replace(current, replacement);
};

let app = read('src/App.tsx');

const currentNav = `            <div ref={navLinksRef} className={\`nav-links \${isNavOpen ? 'open' : ''}\`} id="navLinks">
              <a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={handleNavClick}>Home</a>
              <a href="#work" className={activeSection === 'work' || activeSection === 'style' ? 'active' : ''} onClick={handleNavClick}>Work</a>
              <a href="#media" className={activeSection === 'media' ? 'active' : ''} onClick={handleNavClick}>Media</a>
              <a href="#about" className={activeSection === 'about' ? 'active' : ''} onClick={handleNavClick}>About</a>
              <a href="#start-project" className="nav-cta" onClick={handleNavClick}>Start A Project</a>
            </div>`;

const updatedNav = `            <div ref={navLinksRef} className={\`nav-links \${isNavOpen ? 'open' : ''}\`} id="navLinks">
              <a href="#work" className={activeSection === 'work' ? 'active' : ''} onClick={handleNavClick}>Selected Work</a>
              <a href="#style" className={activeSection === 'style' ? 'active' : ''} onClick={handleNavClick}>Visual Language</a>
              <a href="#media" className={activeSection === 'media' ? 'active' : ''} onClick={handleNavClick}>Media &amp; Live Formats</a>
              <a href="#about" className={activeSection === 'about' ? 'active' : ''} onClick={handleNavClick}>Creative Focus</a>
              <a href="#faq" className={\`nav-secondary-link \${activeSection === 'faq' ? 'active' : ''}\`} onClick={handleNavClick}>Process &amp; Availability</a>
              <a href="#start-project" className="nav-cta" onClick={handleNavClick}>Start A Project</a>
            </div>`;

app = replaceOnce(app, currentNav, updatedNav, 'primary navigation');
app = replaceOnce(
  app,
  '<h2 id="media-title">Media And Live Formats</h2>',
  '<h2 id="media-title">Media &amp; Live Formats</h2>',
  'media section title'
);

const currentFooter = `      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src={getAssetPath('/assets/logos/Senor808_Wordmark_Primary_White.svg')} loading="lazy" decoding="async" alt="Señor 808" />
            <p className="footer-tagline">Bold Visual Art.<br />Clean Creative Presence.</p>
          </div>
          <div className="footer-links">
            <h4>Explore</h4>
            <nav aria-label="Footer navigation">
              <a href="#work" onClick={handleNavClick}>Work</a>
              <a href="#style" onClick={handleNavClick}>Visual Language</a>
              <a href="#media" onClick={handleNavClick}>Media</a>
              <a href="#about" onClick={handleNavClick}>About</a>
            </nav>
          </div>
          <div className="footer-contact">
            <h4>Connect</h4>
            <p>Project inquiries are handled through the guided Start A Project form.</p>
            <a href="#start-project" aria-label="Start a project inquiry" className="footer-btn">Start A Project</a>
            <p className="footer-location">San Antonio, Texas</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} Señor 808 — the visual art practice of Bob Garcia.</p>
        </div>
      </footer>`;

const updatedFooter = `      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src={getAssetPath('/assets/logos/Senor808_Wordmark_Primary_White.svg')} loading="lazy" decoding="async" alt="Señor 808" />
            <p className="footer-tagline">Visual Artist &amp;<br />Audio Storyteller</p>
            <a href="#start-project" aria-label="Start a project inquiry" className="footer-btn">Start A Project</a>
            <nav className="footer-socials" aria-label="Señor 808 social media">
              <a
                className="social-badge"
                href="https://www.instagram.com/808theartist"
                target="_blank"
                rel="me noreferrer"
                aria-label="Señor 808 on Instagram — opens in a new tab"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
                  <circle cx="12" cy="12" r="4.1" />
                  <circle cx="17.4" cy="6.7" r="1" className="social-icon-dot" />
                </svg>
              </a>
              <a
                className="social-badge"
                href="https://www.threads.com/@808theartist"
                target="_blank"
                rel="me noreferrer"
                aria-label="Señor 808 on Threads — opens in a new tab"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M17.8 10.8c-.2-3.8-2.3-6-5.8-6-3.8 0-6.2 2.6-6.2 6.7 0 4.7 2.7 7.7 6.7 7.7 3.4 0 5.6-1.9 5.6-4.6 0-2.5-1.7-4.1-4.5-4.1-2.5 0-4.2 1.5-4.2 3.7 0 2 1.6 3.4 3.8 3.4 2.9 0 4.7-2.1 4.7-5.6 0-4.4-2.6-7.2-6.8-7.2-4.8 0-8 3.3-8 8.3 0 5.5 3.3 9 8.4 9 4.8 0 8-3 8-7.5 0-1-.1-1.9-.3-2.8" />
                </svg>
              </a>
            </nav>
          </div>
          <div className="footer-links">
            <h4>Explore</h4>
            <nav aria-label="Footer navigation">
              <a href="#work" onClick={handleNavClick}>Selected Work</a>
              <a href="#style" onClick={handleNavClick}>Visual Language</a>
              <a href="#media" onClick={handleNavClick}>Media &amp; Live Formats</a>
              <a href="#about" onClick={handleNavClick}>Creative Focus</a>
              <a href="#faq" onClick={handleNavClick}>Process &amp; Availability</a>
            </nav>
            <p className="footer-copyright">© {new Date().getFullYear()} Señor 808 (Bob Garcia)</p>
          </div>
        </div>
      </footer>`;

app = replaceOnce(app, currentFooter, updatedFooter, 'footer');
write('src/App.tsx', app);

let responsive = read('src/responsive-polish.css');
const footerMarker = '/* Footer and navigation closeout polish. */';
if (!responsive.includes(footerMarker)) {
  responsive += `\n\n${footerMarker}
.nav-secondary-link {
  display: none;
}

.site-footer {
  padding: clamp(52px, 6vw, 76px) 0 clamp(30px, 4vw, 46px);
}

.footer-grid {
  grid-template-columns: minmax(250px, 0.82fr) minmax(420px, 1.18fr);
  align-items: start;
  gap: clamp(54px, 9vw, 124px);
  margin-bottom: 0;
}

.footer-brand {
  display: grid;
  justify-items: start;
  gap: 16px;
}

.footer-brand img {
  width: 132px;
  margin-bottom: 2px;
}

.footer-tagline {
  color: var(--text);
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: -0.025em;
}

.footer-brand .footer-btn {
  margin-top: 4px;
}

.footer-socials {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.social-badge {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: var(--muted);
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, transform 180ms ease;
}

.social-badge svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.social-badge .social-icon-dot {
  fill: currentColor;
  stroke: none;
}

.social-badge:hover,
.social-badge:focus-visible {
  color: var(--text);
  border-color: var(--accent);
  background: rgba(216, 27, 96, 0.12);
  transform: translateY(-2px);
}

.footer-links h4 {
  margin-bottom: 18px;
}

.footer-links nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 30px;
}

.footer-links a {
  line-height: 1.45;
}

.footer-copyright {
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.84rem;
}

@media (min-width: 921px) and (max-width: 1180px) {
  .brand {
    min-width: 138px;
  }

  .brand img {
    width: 140px;
  }

  .nav-links {
    gap: 13px;
    font-size: 0.82rem;
  }

  .nav-cta {
    padding-inline: 16px;
  }
}

@media (max-width: 920px) {
  .nav-secondary-link {
    display: block;
  }

  .nav-links.open {
    max-height: calc(100svh - 92px);
    overflow-y: auto;
  }

  .footer-grid {
    grid-template-columns: minmax(220px, 0.8fr) minmax(340px, 1.2fr);
    gap: clamp(38px, 7vw, 68px);
  }
}

@media (max-width: 768px) {
  .site-footer {
    padding-top: 50px;
    padding-bottom: 28px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .footer-links nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-copyright {
    margin-top: 24px;
    padding-top: 18px;
  }
}

@media (max-width: 480px) {
  .site-footer {
    padding-top: 42px;
  }

  .footer-grid {
    gap: 32px;
  }

  .footer-brand {
    gap: 14px;
  }

  .footer-links nav {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .footer-copyright {
    margin-top: 22px;
  }
}
`;
}
write('src/responsive-polish.css', responsive);

let html = read('index.html');
const currentPersonDescription = `            "description": "San Antonio visual artist creating high-contrast mixed-media work, commissions, and live painting, with audio storytelling in development.",
            "homeLocation": {`;
const updatedPersonDescription = `            "description": "San Antonio visual artist creating high-contrast mixed-media work, commissions, and live painting, with audio storytelling in development.",
            "sameAs": [
              "https://www.instagram.com/808theartist",
              "https://www.threads.com/@808theartist"
            ],
            "homeLocation": {`;
html = replaceOnce(html, currentPersonDescription, updatedPersonDescription, 'Person social-profile structured data');
write('index.html', html);

let seoValidator = read('scripts/validate-seo.mjs');
const currentPersonCheck = `    if (!graph.some((node) => node['@type'] === 'WebSite')) fail('WebSite structured data');
    if (!graph.some((node) => node['@type'] === 'Person')) fail('Person structured data');`;
const updatedPersonCheck = `    if (!graph.some((node) => node['@type'] === 'WebSite')) fail('WebSite structured data');
    const person = graph.find((node) => node['@type'] === 'Person');
    if (!person) {
      fail('Person structured data');
    } else {
      const sameAs = Array.isArray(person.sameAs) ? person.sameAs : [];
      for (const profile of [
        'https://www.instagram.com/808theartist',
        'https://www.threads.com/@808theartist'
      ]) {
        if (!sameAs.includes(profile)) fail(\`Person social profile URL \${profile}\`);
      }
    }`;
seoValidator = replaceOnce(seoValidator, currentPersonCheck, updatedPersonCheck, 'SEO social-profile validation');
write('scripts/validate-seo.mjs', seoValidator);

console.log('Footer, navigation, media-title, and social-profile refinements applied.');
