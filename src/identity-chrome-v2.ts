const initializeIdentityChromeV2 = () => {
  const hero = document.querySelector<HTMLElement>('#home.hero');
  const heroCopy = hero?.querySelector<HTMLElement>('.hero-copy');
  const heroTitle = heroCopy?.querySelector<HTMLElement>('h1');
  const heroLead = heroCopy?.querySelector<HTMLElement>('.lead');
  const heroActions = heroCopy?.querySelector<HTMLElement>('.hero-actions');
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const footerTagline = footer?.querySelector<HTMLElement>('.footer-tagline');
  const mobileToggle = document.querySelector<HTMLButtonElement>('.mobile-toggle');

  if (!hero || !heroCopy || !heroTitle || !heroLead || !heroActions || !footer || !footerTagline || !mobileToggle) {
    window.requestAnimationFrame(initializeIdentityChromeV2);
    return;
  }

  if (document.documentElement.dataset.identityChromeV2 === 'ready') return;
  document.documentElement.dataset.identityChromeV2 = 'ready';

  heroTitle.textContent = 'High-Contrast Visual Art';
  heroLead.textContent = 'Spray paint, acrylic layering, and mixed-media mark-making—moving between portraiture, typography, and geometry.';

  let mediaNote = heroCopy.querySelector<HTMLParagraphElement>('.hero-media-note');
  if (!mediaNote) {
    mediaNote = document.createElement('p');
    mediaNote.className = 'hero-media-note';
    mediaNote.textContent = 'Image meets voice through a developing audio storytelling practice.';
    heroCopy.insertBefore(mediaNote, heroActions);
  }

  footerTagline.textContent = 'Image Meets Voice.';

  const socialLinks = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.footer-socials .social-badge.footer-social-icon'));
  socialLinks.forEach((link) => {
    if (link.querySelector('.footer-social-label')) return;
    const accessibleName = link.getAttribute('aria-label') || '';
    const label = accessibleName.includes('Instagram') ? 'Instagram' : accessibleName.includes('Threads') ? 'Threads' : '';
    if (!label) return;
    const span = document.createElement('span');
    span.className = 'footer-social-label';
    span.textContent = label;
    link.append(span);
  });

  const syncMenuLabel = () => {
    const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
    const desiredText = expanded ? 'Close' : 'Menu';
    if (mobileToggle.textContent?.trim() !== desiredText) mobileToggle.textContent = desiredText;
    mobileToggle.setAttribute('aria-label', expanded ? 'Close navigation menu' : 'Open navigation menu');
  };

  syncMenuLabel();
  const menuObserver = new MutationObserver(syncMenuLabel);
  menuObserver.observe(mobileToggle, { attributes: true, attributeFilter: ['aria-expanded'], childList: true });

  const footerObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      document.body.classList.toggle('footer-in-view', visible);
    },
    { threshold: 0.05 }
  );
  footerObserver.observe(footer);
};

initializeIdentityChromeV2();
