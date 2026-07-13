/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import portfolioData from './data/portfolio.json';

type Work = {
  id: number;
  img: string;
  alt?: string;
  title: string;
  cat: string;
  year?: string;
  wide?: boolean;
};

const steps = [
  { title: 'Discover', text: 'Clarify the project type, audience, placement, constraints, timeline, and what proof can be shown publicly.' },
  { title: 'Design', text: 'Translate the need into a visual direction, scope, content requirements, and practical collaboration plan.' },
  { title: 'Produce', text: 'Create the work, document process, protect quality thresholds, and keep communication clear.' },
  { title: 'Publish', text: 'Deliver the finished piece or project presence, then add approved proof, images, captions, and links.' }
];

const stylePillars = [
  {
    title: 'Layered Surface',
    text: 'Spray paint establishes energy and atmosphere. Acrylic layers add depth, control, and close-range discovery.'
  },
  {
    title: 'Broken Geometry',
    text: 'Grids, repeated shapes, and directional lines organize motion while preserving tension and unpredictability.'
  },
  {
    title: 'Human Signal',
    text: 'Portrait fragments, direct gaze, typography, and recurring motifs create narrative anchors inside the layered field.'
  },
  {
    title: 'Grit + Polish',
    text: 'Raw mark-making and precise framing are held in deliberate tension: immediate from a distance, rewarding up close.'
  }
];

const getAssetPath = (path: string) => {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
};

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
};

export default function App() {
  const works = portfolioData as Work[];
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeWorkId, setActiveWorkId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [scrollProgress, setScrollProgress] = useState(0);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const bioDialogRef = useRef<HTMLDivElement>(null);
  const bioCloseRef = useRef<HTMLButtonElement>(null);
  const bioTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const workTriggerRef = useRef<HTMLButtonElement | null>(null);

  const categories = ['All', 'Spray + Acrylic', 'Mixed Media', 'Collage', 'Acrylic', 'Commission'];
  const filteredWorks = activeCategory === 'All' ? works : works.filter((work) => work.cat === activeCategory.toUpperCase());
  const activeWorkIndex = activeWorkId === null ? -1 : works.findIndex((work) => work.id === activeWorkId);
  const activeWork = activeWorkIndex >= 0 ? works[activeWorkIndex] : null;

  useEffect(() => {
    if (isNavOpen && navLinksRef.current) {
      const firstLink = navLinksRef.current.querySelector<HTMLElement>('a');
      if (firstLink && window.innerWidth <= 920) firstLink.focus();
    }
  }, [isNavOpen]);

  useEffect(() => {
    if (isBioModalOpen) bioCloseRef.current?.focus();
  }, [isBioModalOpen]);

  useEffect(() => {
    if (activeWork) lightboxCloseRef.current?.focus();
  }, [activeWork]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 28);
      setShowBackToTop(scrollTop > 720);

      const scrollableHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollableHeight > 0) setScrollProgress((scrollTop / scrollableHeight) * 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -75% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  useEffect(() => {
    document.body.style.overflow = isBioModalOpen || activeWork ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBioModalOpen, activeWork]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isNavOpen) {
          setIsNavOpen(false);
          menuButtonRef.current?.focus();
          return;
        }
        if (activeWork) {
          setActiveWorkId(null);
          workTriggerRef.current?.focus();
          return;
        }
        if (isBioModalOpen) {
          setIsBioModalOpen(false);
          bioTriggerRef.current?.focus();
        }
      }

      if (activeWork && event.key === 'ArrowLeft') {
        event.preventDefault();
        showRelativeWork(-1);
      }
      if (activeWork && event.key === 'ArrowRight') {
        event.preventDefault();
        showRelativeWork(1);
      }

      if (event.key === 'Tab') {
        const activeDialog = activeWork ? lightboxRef.current : isBioModalOpen ? bioDialogRef.current : null;
        if (activeDialog) {
          const focusable = getFocusableElements(activeDialog);
          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              last.focus();
              event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === last) {
              first.focus();
              event.preventDefault();
            }
          }
        }

        if (isNavOpen && window.innerWidth <= 920 && navLinksRef.current && menuButtonRef.current) {
          const links = getFocusableElements(navLinksRef.current);
          if (links.length > 0) {
            const first = links[0];
            const last = links[links.length - 1];
            if (event.shiftKey && document.activeElement === menuButtonRef.current) {
              last.focus();
              event.preventDefault();
            } else if (event.shiftKey && document.activeElement === first) {
              menuButtonRef.current.focus();
              event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === last) {
              menuButtonRef.current.focus();
              event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === menuButtonRef.current) {
              first.focus();
              event.preventDefault();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeWork, isBioModalOpen, isNavOpen, works.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const handleNavClick = () => setIsNavOpen(false);

  const handleCategoryChange = (category: string) => {
    if (category === activeCategory || isFiltering) return;
    setIsFiltering(true);
    window.setTimeout(() => {
      setActiveCategory(category);
      setIsFiltering(false);
    }, 300);
  };

  const openWork = (workId: number, trigger: HTMLButtonElement) => {
    workTriggerRef.current = trigger;
    setActiveWorkId(workId);
  };

  const closeWork = () => {
    setActiveWorkId(null);
    window.setTimeout(() => workTriggerRef.current?.focus(), 0);
  };

  const showRelativeWork = (direction: number) => {
    if (activeWorkIndex < 0) return;
    const nextIndex = (activeWorkIndex + direction + works.length) % works.length;
    setActiveWorkId(works[nextIndex].id);
  };

  const openBio = (trigger: HTMLButtonElement) => {
    bioTriggerRef.current = trigger;
    setIsBioModalOpen(true);
  };

  const closeBio = () => {
    setIsBioModalOpen(false);
    window.setTimeout(() => bioTriggerRef.current?.focus(), 0);
  };

  const heroBgStyle = {
    background: `linear-gradient(90deg, rgba(11,15,20,.96), rgba(11,15,20,.72) 46%, rgba(11,15,20,.36)), linear-gradient(180deg, rgba(11,15,20,.1), rgba(11,15,20,.96)), url("${getAssetPath('/assets/hero/assets_hero_hero-v1.png')}") center / cover no-repeat`
  };

  const mediaBgStyle = {
    background: `linear-gradient(90deg, rgba(17,28,46,.96), rgba(17,28,46,.72) 46%, rgba(11,15,20,.6)), linear-gradient(180deg, rgba(11,15,20,.2), rgba(11,15,20,.96)), url("${getAssetPath('/assets/hero/assets_hero_hero-v3.png')}") center 30% / cover no-repeat`
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="scroll-progress-container" aria-hidden="true">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} id="siteHeader">
        <div className="container nav-row">
          <a className="brand" href="#home" aria-label="Señor 808 home">
            <img src={getAssetPath('/assets/logos/Senor808_Wordmark_Primary_White.svg')} alt="Señor 808" />
          </a>
          <nav aria-label="Primary navigation">
            <button
              ref={menuButtonRef}
              className="btn small mobile-toggle"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isNavOpen}
              aria-controls="navLinks"
              onClick={() => setIsNavOpen((open) => !open)}
            >
              Menu
            </button>
            <div ref={navLinksRef} className={`nav-links ${isNavOpen ? 'open' : ''}`} id="navLinks">
              <a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={handleNavClick}>Home</a>
              <a href="#work" className={activeSection === 'work' || activeSection === 'style' ? 'active' : ''} onClick={handleNavClick}>Work</a>
              <a href="#media" className={activeSection === 'media' ? 'active' : ''} onClick={handleNavClick}>Media</a>
              <a href="#about" className={activeSection === 'about' ? 'active' : ''} onClick={handleNavClick}>About</a>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero reveal-on-scroll" id="home" aria-labelledby="hero-title" style={heroBgStyle}>
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title">Visual Art And Audio Storytelling</h1>
              <p className="lead">San Antonio-based visual artist building high-contrast work in spray paint and acrylic layering, with a podcast lane in active development.</p>
              <div className="hero-actions">
                <a className="btn outline-primary" href="#start-project">Start A Project</a>
                <a className="btn" href="#work">View Work</a>
              </div>
            </div>
          </div>
        </section>

        <section className="proof-strip reveal-on-scroll" aria-label="Quick proof points">
          <div className="container proof-grid">
            <div className="proof-item"><span>Location</span><strong>San Antonio, TX</strong></div>
            <div className="proof-item"><span>Primary Lane</span><strong>Visual Art</strong></div>
            <div className="proof-item"><span>Collaboration</span><strong>Commissions + Live Painting</strong></div>
            <div className="proof-item"><span>Standard</span><strong>Proof-Honest</strong></div>
          </div>
        </section>

        <section className="section reveal-on-scroll" id="work" aria-labelledby="work-title">
          <div className="container">
            <div className="section-head split-head">
              <div>
                <span className="eyebrow">Selected Work</span>
                <h2 id="work-title">High-contrast pieces built around motion, rhythm, and depth.</h2>
              </div>
              <p className="lead">A focused selection of portraiture, typography, geometry, and layered mark-making. Additional details are published only after they are verified and approved.</p>
            </div>

            <div className="filter-list" role="group" aria-label="Filter work by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={activeCategory === category}
                  className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="work-grid" aria-live="polite" aria-busy={isFiltering}>
              {isFiltering ? (
                Array.from({ length: 6 }, (_, index) => (
                  <div className={`work-card skeleton-card ${index === 0 || index === 5 ? 'wide' : ''}`} key={index} aria-hidden="true">
                    <div className="skeleton-image" />
                    <div className="work-meta skeleton-meta">
                      <div className="skeleton-title" />
                      <div className="skeleton-subtitle" />
                    </div>
                  </div>
                ))
              ) : (
                filteredWorks.map((work) => {
                  const verifiedYear = work.year && !work.year.includes('[') ? work.year : null;
                  return (
                    <button
                      key={work.id}
                      type="button"
                      className={`work-card ${work.wide ? 'wide' : ''}`}
                      onClick={(event) => openWork(work.id, event.currentTarget)}
                      aria-label={`Open ${work.title}`}
                    >
                      <img src={getAssetPath(work.img)} loading="lazy" decoding="async" alt={work.alt || work.title} />
                      <div className="work-meta">
                        <strong>{work.title}</strong>
                        <span>{work.cat}{verifiedYear ? ` | ${verifiedYear}` : ''}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="section style-section reveal-on-scroll" id="style" aria-labelledby="style-title">
          <div className="container">
            <div className="style-intro-grid">
              <div>
                <span className="eyebrow">Visual Language</span>
                <h2 id="style-title">Grit, geometry, and signal.</h2>
              </div>
              <div className="style-statement">
                <p className="lead">Señor 808 builds high-contrast surfaces through spray paint, acrylic layering, and mixed-media mark-making. Broken grids, saturated accents, portrait fragments, and typography create movement without reducing the work to a single formula.</p>
              </div>
            </div>

            <div className="style-principles">
              {stylePillars.map((pillar, index) => (
                <article className="style-card" key={pillar.title}>
                  <span className="style-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.text}</p>
                </article>
              ))}
            </div>

            <aside className="style-context" aria-label="Historical context">
              <span>Historical Context</span>
              <p>The work draws on late-20th-century Mexican modernism as an interpretive lineage—especially its movement toward abstraction, structural experimentation, and personal expression—without treating a diverse generation as one fixed visual style.</p>
            </aside>
          </div>
        </section>

        <section className="section alt reveal-on-scroll media-hero" id="media" aria-labelledby="media-title" style={mediaBgStyle}>
          <div className="container">
            <div className="section-head split-head">
              <div>
                <span className="eyebrow">Studio And Stage</span>
                <h2 id="media-title">Media And Live Formats</h2>
              </div>
              <p className="lead">Publishing in phases: visual work and collaboration structure first, with on-air and media proof added only when publish-ready and permissioned.</p>
            </div>
            <div className="cards-3">
              <article className="info-card"><div className="icon-badge">01</div><h3>Visual Commissions</h3><p>Custom artwork and visual pieces scoped around use, timeline, and display needs.</p></article>
              <article className="info-card"><div className="icon-badge">02</div><h3>Live Painting + Venue</h3><p>Event-aligned visual presence and live creative moments for venues, community partners, and cultural programming.</p></article>
              <article className="info-card"><div className="icon-badge">03</div><h3>Audio / Podcast Lane</h3><p>A developing media presence for conversational storytelling. Episodes, clips, and proof will be added only when publish-ready and permissioned.</p></article>
            </div>
          </div>
        </section>

        <section className="section reveal-on-scroll" id="about" aria-labelledby="about-title">
          <div className="container about-grid">
            <div className="portrait-card">
              <img src={getAssetPath('/assets/headshots/assets_headshots_headshot-01.png')} loading="lazy" decoding="async" alt="Portrait of Señor 808" />
            </div>
            <div className="about-copy">
              <span className="eyebrow">Creative Focus</span>
              <h2 id="about-title">An artist-first brand with room to grow.</h2>
              <p className="lead">Señor 808 works where image meets voice. In the studio, he builds high-contrast compositions using spray paint, acrylic layering, and mixed-media mark-making.</p>
              <p>The work moves between portraiture, typography, and geometry—like signal breaking through noise. A developing media practice carries the same interest in rhythm, framing, and point of view into conversation.</p>

              <div className="process-mini">
                <h3>Our Process</h3>
                <div className="process-mini-steps">
                  {steps.map((step, index) => (
                    <div key={step.title} className="process-mini-step">
                      <strong>{String(index + 1).padStart(2, '0')}. {step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn" type="button" onClick={(event) => openBio(event.currentTarget)}>Read Full Bio</button>
            </div>
          </div>
        </section>

        <section className="section reveal-on-scroll" id="faq" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-head split-head">
              <div>
                <span className="eyebrow">Details</span>
                <h2 id="faq-title">Process & Availability</h2>
              </div>
              <p className="lead">Answers to common questions about commissions, shipping, and studio availability.</p>
            </div>
            <div className="faq-grid">
              <div className="faq-item">
                <h3>How do commissions and shipping work?</h3>
                <p>Commission availability, scope, lead times, delivery method, and shipping requirements are confirmed during inquiry review.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt reveal-on-scroll" id="start-project" aria-labelledby="start-title">
          <div className="container">
            <div className="section-head split-head">
              <div>
                <span className="eyebrow">Project Inquiry</span>
                <h2 id="start-title">Start a conversation about artwork.</h2>
              </div>
              <p className="lead">Inquiry routing is being finalized before the form is opened publicly.</p>
            </div>
            <div className="form-shell inquiry-pending" role="status">
              <span className="eyebrow">Opening Soon</span>
              <h3>Project inquiry delivery is being connected.</h3>
              <p>No information entered on this website is currently collected. The form will be activated after successful delivery and spam-protection testing.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
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
            <p>Project inquiry routing is being finalized.</p>
            <a href="#start-project" aria-label="View project inquiry status" className="footer-btn">Inquiry Details</a>
            <p className="footer-location">San Antonio, Texas</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>© {new Date().getFullYear()} Señor 808. Bob Garcia in formal/legal contexts.</p>
        </div>
      </footer>

      <button
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>

      <div
        className={`modal ${isBioModalOpen ? 'active' : ''}`}
        aria-hidden={!isBioModalOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bioTitle"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeBio();
        }}
      >
        <div className="modal-card" ref={bioDialogRef}>
          <div className="modal-top">
            <div>
              <span className="eyebrow">Full Bio</span>
              <h2 id="bioTitle">Señor 808</h2>
            </div>
            <button ref={bioCloseRef} className="modal-close" type="button" aria-label="Close biography" onClick={closeBio}>×</button>
          </div>
          <p>Señor 808 works where image meets voice. In the studio, he builds high-contrast compositions using spray paint, acrylic layering, and mixed-media mark-making. The work moves between portraiture, typography, and geometry—like signal breaking through noise.</p>
          <p style={{ marginTop: '16px' }}>Visual art is the established primary practice. A developing audio and podcast lane extends the same discipline into conversation through clear rhythm, clean framing, and a distinct point of view.</p>
          <p style={{ marginTop: '16px' }}>Additional project history, approved partner references, and media links will be added as they become publish-ready and permissioned.</p>
        </div>
      </div>

      <div
        className={`lightbox ${activeWork ? 'active' : ''}`}
        aria-hidden={!activeWork}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeWork();
        }}
      >
        {activeWork && (
          <div className="lightbox-shell" ref={lightboxRef}>
            <button ref={lightboxCloseRef} className="lightbox-close" type="button" aria-label="Close artwork view" onClick={closeWork}>×</button>
            <button className="lightbox-nav lightbox-prev" type="button" aria-label="Previous artwork" onClick={() => showRelativeWork(-1)}>‹</button>
            <figure>
              <img src={getAssetPath(activeWork.img)} decoding="async" alt={activeWork.alt || activeWork.title} />
              <figcaption>
                <div>
                  <h2 id="lightbox-title">{activeWork.title}</h2>
                  <p>{activeWork.cat}{activeWork.year && !activeWork.year.includes('[') ? ` | ${activeWork.year}` : ''}</p>
                </div>
                <span>{activeWorkIndex + 1} / {works.length}</span>
              </figcaption>
            </figure>
            <button className="lightbox-nav lightbox-next" type="button" aria-label="Next artwork" onClick={() => showRelativeWork(1)}>›</button>
          </div>
        )}
      </div>
    </>
  );
}
