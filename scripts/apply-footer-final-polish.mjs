import fs from 'node:fs';

const appPath = 'src/App.tsx';
const cssPath = 'src/responsive-polish.css';
const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

let app = read(appPath);

const publicNote = '            <p className="form-only-note">Form-only contact. No public phone number is displayed.</p>\n';
if (!app.includes(publicNote)) throw new Error('Expected form-only note was not found.');
app = app.replace(publicNote, '');

const oldSocialBlock = `            <nav className="footer-socials" aria-label="Señor 808 social media">
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
`;
if (!app.includes(oldSocialBlock)) throw new Error('Expected footer social block was not found.');
app = app.replace(oldSocialBlock, '');

const oldCopyright = '            <p className="footer-copyright">© {new Date().getFullYear()} Señor 808 (Bob Garcia)</p>';
const newMeta = `            <div className="footer-meta">
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
                  <span>Instagram</span>
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
                  <span>Threads</span>
                </a>
              </nav>
              <p className="footer-copyright">© {new Date().getFullYear()} Señor 808 (Bob Garcia)</p>
            </div>`;
if (!app.includes(oldCopyright)) throw new Error('Expected footer copyright was not found.');
app = app.replace(oldCopyright, newMeta);
write(appPath, app);

let css = read(cssPath);
const marker = '/* Final footer refinement: editorial hierarchy, social identity, and metadata rhythm. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.footer-tagline {\n  color: var(--muted);\n  font-size: clamp(1.04rem, 1.45vw, 1.2rem);\n  font-weight: 400;\n  line-height: 1.48;\n  letter-spacing: -0.012em;\n}\n\n.footer-brand .footer-btn {\n  width: 100%;\n  max-width: 248px;\n  min-height: 50px;\n  margin-top: 6px;\n  text-align: center;\n}\n\n.footer-meta {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 24px;\n  margin-top: 26px;\n  padding-top: 20px;\n  border-top: 1px solid rgba(255, 255, 255, 0.07);\n}\n\n.footer-socials {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-top: 0;\n}\n\n.social-badge {\n  display: inline-flex;\n  width: auto;\n  min-width: 112px;\n  height: 44px;\n  align-items: center;\n  justify-content: center;\n  gap: 9px;\n  padding: 0 14px 0 12px;\n  border: 1px solid rgba(255, 79, 147, 0.38);\n  border-radius: 999px;\n  background: linear-gradient(135deg, rgba(216, 27, 96, 0.14), rgba(17, 28, 46, 0.62));\n  color: var(--text);\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 22px rgba(0, 0, 0, 0.18);\n}\n\n.social-badge svg {\n  width: 19px;\n  height: 19px;\n}\n\n.social-badge span {\n  font-size: 0.8rem;\n  font-weight: 600;\n  letter-spacing: 0.01em;\n}\n\n.social-badge:hover,\n.social-badge:focus-visible {\n  border-color: var(--accent-2);\n  background: linear-gradient(135deg, rgba(216, 27, 96, 0.24), rgba(17, 28, 46, 0.78));\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 30px rgba(216, 27, 96, 0.16);\n}\n\n.footer-copyright {\n  margin: 0;\n  padding: 0;\n  border-top: 0;\n  text-align: right;\n  white-space: nowrap;\n}\n\n@media (max-width: 920px) {\n  .footer-meta {\n    align-items: flex-start;\n    flex-direction: column;\n    gap: 18px;\n  }\n\n  .footer-copyright {\n    text-align: left;\n  }\n}\n\n@media (max-width: 480px) {\n  .footer-brand .footer-btn {\n    max-width: none;\n  }\n\n  .footer-socials {\n    width: 100%;\n    flex-wrap: wrap;\n  }\n\n  .social-badge {\n    flex: 1 1 130px;\n  }\n\n  .footer-copyright {\n    white-space: normal;\n  }\n}\n`;
}
write(cssPath, css);

console.log('Footer final polish applied successfully.');
