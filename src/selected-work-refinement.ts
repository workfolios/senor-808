import portfolioData from './data/portfolio.json';

type PortfolioItem = {
  id: number;
  img: string;
  alt?: string;
  title: string;
  cat: string;
  year?: string;
  releaseGroup?: string;
};

const RELEASE_GROUP = '2026-08-28';
const works = portfolioData as PortfolioItem[];
const recentWorks = works.filter((work) => work.releaseGroup === RELEASE_GROUP);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const getAssetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const getActiveCategory = () => {
  const active = document.querySelector<HTMLButtonElement>('#work .filter-btn[aria-pressed="true"]');
  return active?.textContent?.trim() || 'All';
};

const getGridCards = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('#work .work-grid .work-card:not(.skeleton-card)'));

const getCardTitle = (card: HTMLButtonElement) =>
  card.querySelector<HTMLElement>('.work-meta strong')?.textContent?.trim() || '';

const openGridArtwork = (title: string) => {
  const target = getGridCards().find((card) => getCardTitle(card) === title);
  target?.click();
};

const updateFilteredLightboxCounter = () => {
  if (getActiveCategory() === 'All') return;
  const lightbox = document.querySelector<HTMLElement>('.lightbox.active');
  const title = lightbox?.querySelector<HTMLElement>('#lightbox-title')?.textContent?.trim();
  const counter = lightbox?.querySelector<HTMLElement>('figcaption > span');
  if (!title || !counter) return;

  const cards = getGridCards();
  const index = cards.findIndex((card) => getCardTitle(card) === title);
  if (index >= 0) counter.textContent = `${index + 1} / ${cards.length}`;
};

const navigateFilteredLightbox = (direction: number) => {
  const lightbox = document.querySelector<HTMLElement>('.lightbox.active');
  const title = lightbox?.querySelector<HTMLElement>('#lightbox-title')?.textContent?.trim();
  if (!title) return;

  const cards = getGridCards();
  const currentIndex = cards.findIndex((card) => getCardTitle(card) === title);
  if (currentIndex < 0 || cards.length === 0) return;

  const nextIndex = (currentIndex + direction + cards.length) % cards.length;
  cards[nextIndex]?.click();
  window.requestAnimationFrame(updateFilteredLightboxCounter);
};

const createRailCard = (work: PortfolioItem) => {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'recent-addition-card';
  card.setAttribute('aria-label', `Open ${work.title}`);
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
  card.addEventListener('click', () => openGridArtwork(work.title));
  return card;
};

const createGalleryChrome = (section: HTMLElement, grid: HTMLElement) => {
  const shell = document.createElement('section');
  shell.className = 'recent-additions-shell';
  shell.setAttribute('aria-labelledby', 'recent-additions-title');

  const header = document.createElement('div');
  header.className = 'gallery-subsection-header';

  const headingBlock = document.createElement('div');
  headingBlock.className = 'gallery-subsection-copy';

  const heading = document.createElement('h3');
  heading.id = 'recent-additions-title';
  heading.textContent = 'Recent Portfolio Additions';

  const summary = document.createElement('p');
  summary.textContent = `August 28, 2026 release · ${recentWorks.length} works`;
  headingBlock.append(heading, summary);

  const controls = document.createElement('div');
  controls.className = 'gallery-rail-controls';

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'gallery-rail-control';
  previous.setAttribute('aria-label', 'Scroll recent artwork backward');
  previous.textContent = '←';

  const status = document.createElement('span');
  status.className = 'gallery-rail-status';
  status.setAttribute('aria-live', 'polite');

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gallery-rail-control';
  next.setAttribute('aria-label', 'Scroll recent artwork forward');
  next.textContent = '→';

  controls.append(previous, status, next);
  header.append(headingBlock, controls);

  const viewport = document.createElement('div');
  viewport.className = 'recent-additions-viewport';
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Recent portfolio additions');

  const track = document.createElement('div');
  track.className = 'recent-additions-track';
  recentWorks.forEach((work) => track.append(createRailCard(work)));
  viewport.append(track);

  shell.append(header, viewport);

  const legacyHeading = document.createElement('div');
  legacyHeading.className = 'legacy-gallery-heading';
  const legacyTitle = document.createElement('h3');
  legacyTitle.textContent = 'More Selected Work';
  const legacySummary = document.createElement('p');
  legacySummary.textContent = 'Earlier portfolio selection · 10 works';
  legacyHeading.append(legacyTitle, legacySummary);

  grid.before(shell, legacyHeading);

  const updateRailState = () => {
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.recent-addition-card'));
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

  return { shell, legacyHeading, updateRailState };
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

  const { shell, legacyHeading, updateRailState } = createGalleryChrome(section, grid);

  let syncQueued = false;
  const syncLayout = () => {
    syncQueued = false;
    const isAll = getActiveCategory() === 'All';
    section.classList.toggle('gallery-all-view', isAll);
    section.classList.toggle('gallery-filtered-view', !isAll);
    shell.hidden = !isAll;
    legacyHeading.hidden = !isAll;
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

initializeGalleryRefinement();
