(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------
     Entrance reveals. Only ever run once per element, and only when the
     browser both supports IntersectionObserver and the visitor has not
     asked for reduced motion.
     ------------------------------------------------------------------ */
  function setupReveals() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-revealed');
      root.setAttribute('data-anim', 'on');
      return;
    }

    root.setAttribute('data-anim', 'on');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });

    // The negative rootMargin means anything sitting in the last slice of a
    // fully-scrolled page would never trigger. Once the visitor reaches the
    // bottom, reveal whatever is still waiting.
    function revealRemainder() {
      var atBottom = window.innerHeight + window.scrollY >=
                     document.documentElement.scrollHeight - 2;
      if (!atBottom) return;
      targets.forEach(function (el) {
        if (el.classList.contains('is-revealed')) return;
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
      window.removeEventListener('scroll', revealRemainder);
    }

    window.addEventListener('scroll', revealRemainder, { passive: true });
    window.addEventListener('load', revealRemainder);
    revealRemainder();
  }

  /* ------------------------------------------------------------------
     The process rail fills as the seven steps scroll past. The section
     argues that the process is proven and sequential, so the rail behaves
     like one instead of being a static decoration.
     ------------------------------------------------------------------ */
  function setupRail() {
    var steps = document.getElementById('steps');
    if (!steps || reduced.matches) return;

    var items = Array.prototype.slice.call(steps.querySelectorAll('.step'));
    if (!items.length) return;

    steps.setAttribute('data-rail', 'live');

    var ticking = false;

    function update() {
      ticking = false;
      var box = steps.getBoundingClientRect();
      var anchor = window.innerHeight * 0.62;

      // 0 before the list reaches the anchor line, 1 once it has passed it.
      var progress = (anchor - box.top) / Math.max(box.height, 1);
      progress = Math.min(1, Math.max(0, progress));
      steps.style.setProperty('--fill', progress.toFixed(4));

      for (var i = 0; i < items.length; i++) {
        var dot = items[i].querySelector('.step-num');
        var reached = dot ? dot.getBoundingClientRect().top < anchor : false;
        items[i].setAttribute('data-reached', reached ? 'true' : 'false');
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     The header only grows a border and shadow once the page has moved,
     so it sits flush against the hero at rest.
     ------------------------------------------------------------------ */
  function setupHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var ticking = false;

    function update() {
      ticking = false;
      header.setAttribute('data-stuck', window.scrollY > 12 ? 'true' : 'false');
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    update();

    /* Hamburger panel, same behaviour as the home's nav: the button toggles
       it, and a tap on a link, a click outside, Escape, or growing back to
       desktop all close it. */
    var toggle = header.querySelector('.nav-toggle');
    var links = header.querySelector('.nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(!header.classList.contains('nav-open'));
    });

    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (event) {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) setOpen(false);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     In-page links land below the sticky header rather than under it.
     ------------------------------------------------------------------ */
  function setupAnchors() {
    var header = document.querySelector('.site-header');

    document.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (!link) return;

      var id = link.getAttribute('href');
      if (!id || id === '#') return;

      var target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();

      var offset = header ? header.offsetHeight + 14 : 0;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top: top,
        behavior: reduced.matches ? 'auto' : 'smooth'
      });

      // Keep the keyboard where the mouse just went.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  function init() {
    setupReveals();
    setupRail();
    setupHeader();
    setupAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
