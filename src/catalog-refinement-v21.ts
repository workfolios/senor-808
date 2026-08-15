/* Version 2.1 Catalog-driven interaction enhancements.
   Keeps the existing React architecture intact while strengthening current-state,
   compact-navigation isolation, and reduced-motion behavior. */

const compactNavigationMedia = window.matchMedia('(max-width: 920px)');
const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

const startNavigationEnhancements = () => {
  const navLinks = document.getElementById('navLinks');

  if (!navLinks) {
    window.requestAnimationFrame(startNavigationEnhancements);
    return;
  }

  const synchronizeNavigationState = () => {
    const compactMenuIsOpen = navLinks.classList.contains('open') && compactNavigationMedia.matches;
    document.body.classList.toggle('nav-overlay-open', compactMenuIsOpen);

    navLinks.querySelectorAll<HTMLAnchorElement>('a:not(.nav-cta)').forEach((link) => {
      if (link.classList.contains('active')) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const navigationObserver = new MutationObserver(synchronizeNavigationState);
  navigationObserver.observe(navLinks, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });

  compactNavigationMedia.addEventListener('change', synchronizeNavigationState);
  synchronizeNavigationState();
};

const handleReducedMotionBackToTop = (event: MouseEvent) => {
  if (!reducedMotionMedia.matches || !(event.target instanceof Element)) return;

  const backToTop = event.target.closest<HTMLButtonElement>('.back-to-top');
  if (!backToTop) return;

  event.preventDefault();
  event.stopPropagation();
  window.scrollTo({ top: 0, behavior: 'auto' });
};

document.addEventListener('click', handleReducedMotionBackToTop, true);
window.requestAnimationFrame(startNavigationEnhancements);
