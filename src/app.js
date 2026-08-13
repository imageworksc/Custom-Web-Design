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
     The process flow. It is a row of seven on a wide screen and a stack
     on a narrow one, and the connector has to be measured either way —
     the markers are the only thing that knows where the run really
     starts and ends.

     In the row, pointing at a step runs the connector up to it and
     lights every step behind it. The stack has no hover to rely on, so
     it simply shows the run complete.
     ------------------------------------------------------------------ */
  function setupRail() {
    var flow = document.getElementById('steps');
    if (!flow) return;

    var list = flow.querySelector('.flow-list');
    var items = Array.prototype.slice.call(flow.querySelectorAll('.step'));
    if (!list || !items.length) return;

    var markers = items.map(function (el) { return el.querySelector('.step-num'); });
    if (markers.indexOf(null) > -1) return;

    var thumb = list.querySelector('.flow-thumb');
    var progress = list.querySelector('.flow-progress');

    var last = items.length - 1;
    var isRow = false;

    /* Layout position of el inside root, on one axis. Rects are no good here —
       the steps still carry the reveal transform when this runs, and a rect
       would hand back the animated position. A single offsetTop is no good
       either: a step that is still transformed becomes its own offsetParent,
       so the chain has to be walked rather than read once. */
    function offsetIn(el, root, axis) {
      var v = 0;
      while (el && el !== root) {
        v += (axis === 'x' ? el.offsetLeft : el.offsetTop);
        el = el.offsetParent;
      }
      return el === root ? v : null;
    }

    function measure() {
      var a = markers[0];
      var b = markers[last];

      var y1 = offsetIn(a, list, 'y');
      var y2 = offsetIn(b, list, 'y');
      var x1 = offsetIn(a, list, 'x');
      var x2 = offsetIn(b, list, 'x');
      if (y1 === null || y2 === null || x1 === null || x2 === null) return;

      // one row or a stack? the last marker's own position answers it
      isRow = Math.abs(y2 - y1) < 4;

      var start, span;
      if (isRow) {
        start = x1 + a.offsetWidth / 2;
        span = (x2 + b.offsetWidth / 2) - start;
        if (span <= 0) return;
        flow.style.setProperty('--rail-left', start.toFixed(1) + 'px');
      } else {
        start = y1 + a.offsetHeight / 2;
        span = (y2 + b.offsetHeight / 2) - start;
        if (span <= 0) return;
        flow.style.setProperty('--rail-top', start.toFixed(1) + 'px');
      }
      flow.style.setProperty('--rail-span', span.toFixed(1) + 'px');
    }

    /* Three states, the way a stepper reads: everything before the pointer is
       done, the step under it is active, the rest are ahead. --active is the
       index the white thumb slides to; --fill is what the stacked rail uses. */
    function show(index) {
      flow.style.setProperty('--fill', (index < 0 ? 0 : index / last).toFixed(4));
      for (var i = 0; i < items.length; i++) {
        items[i].setAttribute('data-reached', i <= index ? 'true' : 'false');
        items[i].setAttribute('data-state',
          i < index ? 'done' : (i === index ? 'active' : 'ahead'));
      }
      if (!thumb || !isRow) return;
      var at = markers[index < 0 ? 0 : index];
      var x = offsetIn(at, list, 'x');
      if (x === null) return;
      thumb.style.left = x + 'px';
      thumb.style.width = at.offsetWidth + 'px';
      /* The fill runs under the thumb, not up to it: two rounded ends facing
         each other leave a lens of bare track between them, and at this size
         that reads as a grey seam. The thumb is opaque, so the overlap is
         invisible and the join is not. */
      if (progress) progress.style.width = (x + at.offsetWidth) + 'px';
    }

    function rest() {
      /* The row parks on the first step rather than on nothing — a stepper
         with no current step reads as broken. The stack gets no pointer at
         all, so it reads as done. */
      show(isRow ? 0 : last);
    }

    function sync() {
      measure();
      rest();
    }

    sync();
    window.addEventListener('resize', sync, { passive: true });
    // web fonts land after first paint and change every step's box
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);

    items.forEach(function (step, i) {
      step.addEventListener('pointerenter', function () { if (isRow) show(i); }, { passive: true });
      // focus, not focus-visible: the handler cannot ask which one it was, and
      // a keyboard tab through the run should light it the same way
      step.addEventListener('focus', function () { if (isRow) show(i); });
    });

    list.addEventListener('pointerleave', function () { rest(); }, { passive: true });
    list.addEventListener('focusout', function (event) {
      if (!list.contains(event.relatedTarget)) rest();
    });

    // The node rides the head of the fill, and that is motion.
    if (!reduced.matches) flow.setAttribute('data-rail', 'live');
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
     The nav's dropdowns. Pointing at a top-level item opens it and
     closes the others; leaving waits a moment first, so crossing the gap
     between the button and the panel does not shut it. The button also
     answers a click and a focus, so the run works from the keyboard.

     Below the breakpoint the panels are unfolded in place by CSS, and
     the buttons are left alone — there is nothing to open.
     ------------------------------------------------------------------ */
  function setupMenu() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.menu__item[data-menu]')
    );
    if (!items.length) return;

    var stacked = window.matchMedia('(max-width: 1024px)');
    var timer = null;

    function closeAll() {
      items.forEach(function (item) {
        item.classList.remove('is-open');
        var btn = item.querySelector('.menu__link');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    items.forEach(function (item) {
      var btn = item.querySelector('.menu__link');
      if (!btn) return;

      function open() {
        if (stacked.matches) return;
        window.clearTimeout(timer);
        closeAll();
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }

      item.addEventListener('pointerenter', open, { passive: true });
      item.addEventListener('pointerleave', function () {
        if (stacked.matches) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(closeAll, 140);
      }, { passive: true });

      btn.addEventListener('focus', open);
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        if (stacked.matches) return;
        if (item.classList.contains('is-open')) closeAll(); else open();
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.menu__item')) closeAll();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
    // a panel left open behind the hamburger would sit on top of the page
    stacked.addEventListener('change', closeAll);
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

  function init() {
    setupReveals();
    setupRail();
    setupHeader();
    setupMenu();
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
