(function () {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* How far below the top of the viewport an element comes to rest when the
     page scrolls it into view. Mirrors --anchor-offset in the stylesheet, which
     does the same job for the browser's own scrolling; raise both together if
     the host site puts a fixed header above this page. */
  const ANCHOR_OFFSET = 24;

  /* ------------------------------------------------------------------
     Set before the body is parsed, which is why this file is loaded in
     the head rather than deferred. The hero's entrance hides its own
     content until it plays, and that content is the most important
     thing on the page — gating the hidden state on this flag means a
     page that never runs this line shows the hero outright instead of a
     blank band.
     ------------------------------------------------------------------ */
  root.setAttribute('data-hero-anim', 'on');

  /* ------------------------------------------------------------------
     Entrance reveals. Only ever run once per element, and only when the
     browser both supports IntersectionObserver and the visitor has not
     asked for reduced motion.
     ------------------------------------------------------------------ */
  function setupReveals() {
    const targets = [...document.querySelectorAll('.reveal')];
    if (!targets.length) return;

    root.setAttribute('data-anim', 'on');

    if (reduced.matches || !('IntersectionObserver' in window)) {
      for (const el of targets) el.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    for (const el of targets) observer.observe(el);

    // The negative rootMargin means anything sitting in the last slice of a
    // fully-scrolled page would never trigger. Once the visitor reaches the
    // bottom, reveal whatever is still waiting.
    const revealRemainder = () => {
      const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;
      if (!atBottom) return;
      for (const el of targets) {
        if (el.classList.contains('is-revealed')) continue;
        el.classList.add('is-revealed');
        observer.unobserve(el);
      }
      window.removeEventListener('scroll', revealRemainder);
    };

    window.addEventListener('scroll', revealRemainder, { passive: true });
    window.addEventListener('load', revealRemainder);
    revealRemainder();
  }

  /* ------------------------------------------------------------------
     Both accordions — the six build stages and the FAQ — are exclusive,
     so opening one item closes another and the page can shift under the
     reader. After an item settles, bring it back into view if it ended
     up above the top edge or past the fold.
     ------------------------------------------------------------------ */
  function setupAccordions() {
    for (const item of document.querySelectorAll('[data-accordion] > details')) {
      /* A <details> that is open in the markup fires its own toggle once the
         page has loaded, and the stage that starts open sits below the fold —
         so only an open the reader asked for is followed. */
      let asked = false;
      item.querySelector('summary')?.addEventListener('click', () => { asked = true; });

      item.addEventListener('toggle', () => {
        if (!item.open || !asked) return;
        asked = false;

        const settle = () => {
          const box = item.getBoundingClientRect();
          const hiddenAbove = box.top < ANCHOR_OFFSET;
          const hiddenBelow = box.bottom > window.innerHeight &&
                              box.height < window.innerHeight - ANCHOR_OFFSET;
          if (!hiddenAbove && !hiddenBelow) return;

          window.scrollTo({
            top: box.top + window.scrollY - ANCHOR_OFFSET,
            behavior: reduced.matches ? 'auto' : 'smooth',
          });
        };

        // wait out the height transition before measuring
        if (reduced.matches) settle();
        else window.setTimeout(settle, 380);
      });
    }
  }

  function init() {
    setupReveals();
    setupAccordions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
