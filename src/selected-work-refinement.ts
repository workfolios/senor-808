import portfolioData from './data/portfolio.json';

type PortfolioItem = {
  id: number;
  img: string;
  alt?: string;
  title: string;
  cat: string;
  year?: string;
};

const RAIL_WORK_IDS = [17, 5, 11, 2, 13, 4, 3, 15, 7, 14, 10, 16];
const railWorkIdSet = new Set(RAIL_WORK_IDS);
const works = portfolioData as PortfolioItem[];
const workByTitle = new Map(works.map((work) => [work.title, work]));
const railWorks = RAIL_WORK_IDS.map((id) => works.find((work) => work.id === id)).filter(Boolean) as PortfolioItem[];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastRailTrigger: HTMLButtonElement | null = null;

const getAssetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const getActiveCategory = () => {
  const active = document.querySelector<HTMLButtonElement>('#work .filter-btn[aria-pressed="true"]');
  return active?.textContent?.trim() || 'All';
};

const getGridCards = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('#work .work-grid .work-card:not(.skeleton-card)'));

const getCardTitle = (card: HTMLButtonElement) =>
  card.querySelector<HTMLElement>('.work-meta strong')?.textContent?.trim() || '';

const syncGridRoleVisibility = (isAll: boolean) => {
  getGridCards().forEach((card) => {
    const work = workByTitle.get(getCardTitle(card));
    if (!work) return;
    card.dataset.workId = String(work.id);
    card.hidden = isAll && railWorkIdSet.has(work.id);
  });
};

const openGridArtwork = (title: string, railTrigger?: HTMLButtonElement) => {
  const target = getGridCards().find((card) => getCardTitle(card) === title);
  if (!target) return;
  lastRailTrigger = railTrigger || null;
  target.click();
};

const updateFilteredLightboxCounter = () => {
  if (getActiveCategory() === 'All') return;
  const lightbox = document.querySelector<HTMLElement>('.lightbox.active');
  const title = lightbox?.querySelector<HTMLElement>('#lightbox-title')?.textContent?.trim();
  const counter = lightbox?.querySelector<HTMLElement>('figcaption > span');
  if (!title || !counter) return;

  const cards = getGridCards();
  const index = cards.findIndex((card) => getCardTitle(card) === title);
  if (index < 0) return;

  const desired = `${index + 1} / ${cards.length}`;
  if (counter.textContent?.trim() !== desired) counter.textContent = desired;
};

const navigateFilteredLightbox = (direction: number) => {
  const lightbox = document.querySelector<HTMLElement>('.lightbox.active');
  const title = lightbox?.querySelector<HTMLElement>('#lightbox-title')?.textContent?.trim();
  if (!title) return;

  const cards = getGridCards();
  const currentIndex = cards.findIndex((card) => getCardTitle(card) === title);
  if (currentIndex < 0 || cards.length === 0) return;

  const nextIndex = (currentIndex + direction + cards.length) % cards.length;
  lastRailTrigger = null;
  cards[nextIndex]?.click();
  window.requestAnimationFrame(updateFilteredLightboxCounter);
};

const createRailCard = (work: PortfolioItem) => {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'selected-work-rail-card';
  card.setAttribute('aria-label', `Open ${work.title}`);
  card.dataset.workId = String(work.id);
  card.dataset.workTitle = work.title;

  const image = document.createElement('img');
  image.src = getAssetPath(work.img);
  image.alt = work.alt || work.title;
  image.loading = 'lazy';
  image.decoding = 'async';

  const meta = document.createElement('div');
  meta.className = 'work-meta';

  const title = document.createElement('strong');
  title.textContent = work.title;

  const category = document.createElement('span');
  const verifiedYear = work.year && !work.year.includes('[') ? ` | ${work.year}` : '';
  category.textContent = `${work.cat}${verifiedYear}`;

  meta.append(title, category);
  card.append(image, meta);
  card.addEventListener('click', () => openGridArtwork(work.title, card));
  return card;
};

const createGalleryRail = (grid: HTMLElement) => {
  const shell = document.createElement('div');
  shell.className = 'selected-work-rail-shell';

  const toolbar = document.createElement('div');
  toolbar.className = 'gallery-rail-toolbar';

  const controls = document.createElement('div');
  controls.className = 'gallery-rail-controls';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'gallery-rail-control';
  previous.setAttribute('aria-label', 'Scroll artwork backward');
  previous.textContent = '←';

  const status = document.createElement('span');
  status.className = 'gallery-rail-status';
  status.setAttribute('aria-live', 'polite');

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gallery-rail-control';
  next.setAttribute('aria-label', 'Scroll artwork forward');
  next.textContent = '→';

  controls.append(previous, status, next);
  toolbar.append(controls);

  const viewport = document.createElement('div');
  viewport.className = 'selected-work-rail-viewport';
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Selected artwork showcase');

  const track = document.createElement('div');
  track.className = 'selected-work-rail-track';
  railWorks.forEach((work) => track.append(createRailCard(work)));
  viewport.append(track);

  shell.append(toolbar, viewport);
  grid.before(shell);

  const updateRailState = () => {
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.selected-work-rail-card'));
    if (cards.length === 0) return;
    const firstCard = cards[0];
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    const firstIndex = Math.max(0, Math.min(cards.length - 1, Math.round(viewport.scrollLeft / Math.max(step, 1))));
    const visibleCount = Math.max(1, Math.floor((viewport.clientWidth + gap) / Math.max(step, 1)));
    const lastIndex = Math.min(cards.length, firstIndex + visibleCount);
    status.textContent = `${firstIndex + 1}–${lastIndex} of ${cards.length}`;
    previous.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2;
  };

  const scrollRail = (direction: number) => {
    viewport.scrollBy({
      left: direction * viewport.clientWidth * 0.82,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    });
  };

  previous.addEventListener('click', () => scrollRail(-1));
  next.addEventListener('click', () => scrollRail(1));
  viewport.addEventListener('scroll', () => window.requestAnimationFrame(updateRailState), { passive: true });
  new ResizeObserver(updateRailState).observe(viewport);
  window.requestAnimationFrame(updateRailState);

  return { shell, updateRailState };
};

const initializeGalleryRefinement = () => {
  const section = document.querySelector<HTMLElement>('#work');
  const grid = section?.querySelector<HTMLElement>('.work-grid');
  if (!section || !grid) {
    window.requestAnimationFrame(initializeGalleryRefinement);
    return;
  }

  if (section.dataset.galleryRefinement === 'ready') return;
  section.dataset.galleryRefinement = 'ready';
  section.classList.add('gallery-refinement-active');

  const { shell, updateRailState } = createGalleryRail(grid);

  let syncQueued = false;
  const syncLayout = () => {
    syncQueued = false;
    const isAll = getActiveCategory() === 'All';
    section.classList.toggle('gallery-all-view', isAll);
    section.classList.toggle('gallery-filtered-view', !isAll);
    shell.hidden = !isAll;
    syncGridRoleVisibility(isAll);
    if (!isAll) lastRailTrigger = null;
    if (isAll) window.requestAnimationFrame(updateRailState);
    window.requestAnimationFrame(updateFilteredLightboxCounter);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(syncLayout);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(section, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'aria-busy'],
  });

  const lightbox = document.querySelector<HTMLElement>('.lightbox');
  if (lightbox) {
    let lightboxSyncQueued = false;
    const queueLightboxSync = () => {
      if (lightboxSyncQueued) return;
      lightboxSyncQueued = true;
      window.requestAnimationFrame(() => {
        lightboxSyncQueued = false;
        updateFilteredLightboxCounter();
      });
    };

    new MutationObserver(() => {
      if (lightbox.getAttribute('aria-hidden') === 'true' && lastRailTrigger) {
        const trigger = lastRailTrigger;
        lastRailTrigger = null;
        window.setTimeout(() => trigger.focus(), 20);
      }
      queueLightboxSync();
    }).observe(lightbox, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'class'],
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  document.addEventListener(
    'click',
    (event) => {
      if (getActiveCategory() === 'All') return;
      const target = event.target as Element | null;
      const nav = target?.closest('.lightbox-prev, .lightbox-next');
      if (!nav) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateFilteredLightbox(nav.classList.contains('lightbox-prev') ? -1 : 1);
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (getActiveCategory() === 'All' || !document.querySelector('.lightbox.active')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigateFilteredLightbox(event.key === 'ArrowLeft' ? -1 : 1);
    },
    true,
  );

  syncLayout();
};

const initializeIdentityEmblemRemoval = () => {
  const bioCard = document.querySelector<HTMLElement>('.bio-modal-card');
  const footerGrid = document.querySelector<HTMLElement>('.site-footer .footer-grid');
  if (!bioCard || !footerGrid) {
    window.requestAnimationFrame(initializeIdentityEmblemRemoval);
    return;
  }

  document.querySelector('#about .portrait-signature-mark')?.remove();
  document.querySelector('#about .portrait-card')?.classList.remove('portrait-card-signature-enabled');
  bioCard.querySelector('.bio-header-emblem')?.remove();
  bioCard.querySelector('.bio-modal-signoff')?.remove();
  bioCard.querySelector('.bio-signature-endcap')?.remove();
  footerGrid.querySelector('.footer-signature-emblem')?.remove();
};

initializeGalleryRefinement();
initializeIdentityEmblemRemoval();
