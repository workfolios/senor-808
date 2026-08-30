const initializeFooterStudioClose = () => {
  const footer = document.querySelector<HTMLElement>('.site-footer');
  const grid = footer?.querySelector<HTMLElement>('.footer-grid');
  const brand = grid?.querySelector<HTMLElement>('.footer-brand');
  const links = grid?.querySelector<HTMLElement>('.footer-links');
  const primaryCta = brand?.querySelector<HTMLAnchorElement>('.footer-btn');
  const meta = links?.querySelector<HTMLElement>('.footer-meta');

  if (!footer || !grid || !brand || !links || !primaryCta || !meta) {
    window.requestAnimationFrame(initializeFooterStudioClose);
    return;
  }

  if (footer.dataset.footerStudioClose === 'ready') return;
  footer.dataset.footerStudioClose = 'ready';

  links.querySelector('.footer-heading')?.remove();
  links.querySelector('nav[aria-label="Footer navigation"]')?.remove();

  const actions = document.createElement('div');
  actions.className = 'footer-actions';
  actions.setAttribute('aria-label', 'Footer actions');

  primaryCta.classList.add('footer-btn-primary');
  actions.append(primaryCta);

  const selectedWorkCta = document.createElement('a');
  selectedWorkCta.className = 'footer-btn footer-btn-secondary';
  selectedWorkCta.href = '#work';
  selectedWorkCta.textContent = 'View Selected Work';
  actions.append(selectedWorkCta);

  grid.append(actions);
  grid.append(meta);
  links.remove();
};

initializeFooterStudioClose();
