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
    if (!steps) return;

    var items = Array.prototype.slice.call(steps.querySelectorAll('.step'));
    if (!items.length) return;

    /* The markers are centred on their cards, and the cards are different
       heights, so only a measurement knows where the first and last one sit.
       Without this the rail overshoots both ends of the run. */
    /* Layout position of el inside root. Rects are no good here — the steps
       still carry the reveal transform when this runs, and a rect would hand
       back the animated position. offsetTop alone is no good either: a step
       that is still transformed becomes its own offsetParent, so the chain has
       to be walked rather than read once. */
    function offsetIn(el, root) {
      var y = 0;
      while (el && el !== root) {
        y += el.offsetTop;
        el = el.offsetParent;
      }
      return el === root ? y : null;
    }

    function measure() {
      var first = items[0].querySelector('.step-num');
      var last = items[items.length - 1].querySelector('.step-num');
      if (!first || !last) return;

      var a = offsetIn(first, steps);
      var b = offsetIn(last, steps);
      if (a === null || b === null) return;

      var top = a + first.offsetHeight / 2;
      var span = (b + last.offsetHeight / 2) - top;
      if (span <= 0) return;

      steps.style.setProperty('--rail-top', top.toFixed(1) + 'px');
      steps.style.setProperty('--rail-span', span.toFixed(1) + 'px');
    }

    measure();
    window.addEventListener('resize', measure, { passive: true });
    // web fonts land after first paint and change every card's height
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    // The travelling fill and the node are motion; the geometry above is not.
    if (reduced.matches) return;

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

  /* ------------------------------------------------------------------
     The accordion is exclusive, so opening one answer closes another and
     the page can shift under the reader. After an answer settles, bring it
     back into view if it ended up under the header or past the fold.
     ------------------------------------------------------------------ */
  function setupFaq() {
    var faq = document.querySelector('[data-faq]');
    if (!faq) return;

    var header = document.querySelector('.site-header');
    var items = [].slice.call(faq.querySelectorAll('details'));

    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;

        var settle = function () {
          var offset = (header ? header.offsetHeight : 0) + 16;
          var box = item.getBoundingClientRect();
          var hiddenAbove = box.top < offset;
          var hiddenBelow = box.bottom > window.innerHeight && box.height < window.innerHeight - offset;
          if (!hiddenAbove && !hiddenBelow) return;

          window.scrollTo({
            top: box.top + window.scrollY - offset,
            behavior: reduced.matches ? 'auto' : 'smooth'
          });
        };

        // wait out the height transition before measuring
        if (reduced.matches) settle();
        else window.setTimeout(settle, 380);
      });
    });
  }

  /* ------------------------------------------------------------------
     The three figures count up once, the first time the row is reached.
     Without JS — or with reduced motion — the markup already holds the
     final value, so nothing is lost.
     ------------------------------------------------------------------ */
  function setupCounts() {
    var nums = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!nums.length || reduced.matches || !('IntersectionObserver' in window)) return;

    function render(el, value) {
      el.textContent = value + (el.getAttribute('data-suffix') || '');
    }

    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      var duration = 1100;
      var started = null;

      function step(now) {
        if (started === null) started = now;
        var p = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        render(el, Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(step);
      }

      window.requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) {
      render(el, 0);
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     The credentials pane is glass, and glass shows where the light is
     coming from. The pointer's bearing from the centre of the card sets
     the angle of its sheen; letting go returns it to rest.
     ------------------------------------------------------------------ */
  function setupGlare() {
    var card = document.querySelector('[data-glare]');
    if (!card || reduced.matches) return;

    var REST = 135;
    var angle = REST, target = REST, lit = 0, litTarget = 0;
    var raf = null;

    function apply() {
      card.style.setProperty('--glare', angle.toFixed(1) + 'deg');
      card.style.setProperty('--glare-lit', lit.toFixed(3));
    }

    function tick() {
      // shortest way round, so 350deg to 10deg is 20deg and not 340
      var delta = ((target - angle + 540) % 360) - 180;
      angle = (angle + delta * 0.18 + 360) % 360;
      lit += (litTarget - lit) * 0.12;
      apply();

      if (Math.abs(delta) > 0.2 || Math.abs(litTarget - lit) > 0.004) {
        raf = window.requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }

    function run() {
      if (raf === null) raf = window.requestAnimationFrame(tick);
    }

    card.addEventListener('pointermove', function (event) {
      var r = card.getBoundingClientRect();
      var dx = event.clientX - (r.left + r.width / 2);
      var dy = event.clientY - (r.top + r.height / 2);
      /* CSS gradient angles are clockwise from "to top", which is what
         atan2(dx, -dy) gives directly. The light comes from the pointer, so
         the gradient has to start on the opposite side: +180. */
      target = (Math.atan2(dx, -dy) * 180 / Math.PI + 180 + 360) % 360;
      litTarget = 1;
      run();
    }, { passive: true });

    card.addEventListener('pointerleave', function () {
      target = REST;
      litTarget = 0;
      run();
    }, { passive: true });
  }

  function init() {
    setupReveals();
    setupRail();
    setupGlare();
    setupHeader();
    setupAnchors();
    setupFaq();
    setupCounts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
