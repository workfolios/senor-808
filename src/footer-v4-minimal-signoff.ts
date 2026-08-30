const initializeFooterMinimalSignoff = () => {
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const grid = footer?.querySelector<HTMLElement>('.footer-grid');
  const brand = grid?.querySelector<HTMLElement>('.footer-brand');
  const links = grid?.querySelector<HTMLElement>('.footer-links');
  const meta = links?.querySelector<HTMLElement>('.footer-meta');

  if (!footer || !grid || !brand || !links || !meta) {
    window.requestAnimationFrame(initializeFooterMinimalSignoff);
    return;
  }

  if (footer.dataset.footerMinimalSignoff === 'ready') return;
  footer.dataset.footerMinimalSignoff = 'ready';

  brand.querySelector('.footer-btn')?.remove();
  links.querySelector('.footer-heading')?.remove();
  links.querySelector('nav[aria-label="Footer navigation"]')?.remove();

  const socialLinks = Array.from(meta.querySelectorAll<HTMLAnchorElement>('.footer-socials .social-badge'));
  socialLinks.forEach((link) => {
    const label = link.querySelector('span')?.textContent?.trim() || '';
    link.querySelector('span')?.remove();
    link.classList.add('footer-social-icon');
    if (label) link.dataset.tooltip = label;
  });

  grid.append(meta);
  links.remove();
};

initializeFooterMinimalSignoff();
