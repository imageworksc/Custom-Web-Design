/* ---------------------------------------------------------------------------
   HERO MESH
   The home weaves a cloth behind its hero: standing threads, a weft that runs
   over one and under the next, and a dent that follows the cursor. Same idea
   here, drawn dark on white instead of light on navy.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var hero = document.querySelector('[data-hero]');
  if (!hero) return;

  var canvas = hero.querySelector('[data-mesh]');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var WARP_GAP = 54;      // spacing of the standing threads
  var ROWS = 13;          // weft rows across the height
  var SEGS = 10;          // samples per thread — enough for the dent to bend it
  var FLOAT = 5;          // gap left where the weft passes under a warp
  var INFLUENCE = 250;    // how far the dent under the cursor reaches
  var PULL = 22;          // how far the cloth slides toward it
  var PASS_MS = 5200;     // one crossing of the shuttle
  var REST_MS = 1100;

  var NAVY = '20, 60, 102';
  var GREEN = '128, 195, 74';

  var W = 0, H = 0, dpr = 1;
  var warps = [], rows = [];
  var rowN = 0, passStart = 0;
  var raf = null, running = false;

  var px = -9999, py = -9999;   // raw pointer, in hero space
  var cx = -9999, cy = -9999;   // eased pointer, so the dent glides
  var strength = 0;

  // disp() runs thousands of times a frame, so it writes to these instead of
  // allocating a point object per call.
  var dX = 0, dY = 0;

  function disp(x, y) {
    dX = x; dY = y;
    if (strength < 0.004 || cx < -9000) return;
    var ddx = x - cx, ddy = y - cy;
    var d = Math.sqrt(ddx * ddx + ddy * ddy);
    if (d >= INFLUENCE) return;
    var f = 1 - d / INFLUENCE;
    var e = f * f * strength;
    var inv = 1 / (d || 1);
    dX = x - ddx * inv * e * PULL;
    dY = y - ddy * inv * e * PULL;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var r = hero.getBoundingClientRect();
    W = Math.round(r.width);
    H = Math.round(r.height);
    if (!W || !H) return false;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* No white well over the copy: it was centred on the left, which left the
       cloth reading heavier on the right. The alphas below are low enough to
       sit under the headline unaided, so the weave is even edge to edge. */
    warps.length = 0;
    var n = Math.ceil(W / WARP_GAP) + 1;
    var off = (W - (n - 1) * WARP_GAP) / 2;
    for (var i = 0; i < n; i++) {
      warps.push({ x: off + i * WARP_GAP, a: rand(0.066, 0.142), w: rand(0.8, 1.4) });
    }

    rows.length = 0;
    var top = H * 0.09, bot = H * 0.93;
    for (var j = 0; j < ROWS; j++) {
      rows.push({
        y: top + (bot - top) * (j / (ROWS - 1)),
        base: 0.071,
        lit: 0,
        col: (j % 4 === 2) ? GREEN : NAVY,
        parity: j % 2
      });
    }

    // The loom opens mid-canvas: starting at row 0 puts the first pass up
    // under the nav where nobody sees it.
    rowN = Math.floor(ROWS / 2);
    passStart = 0;
    return true;
  }

  /* Where warp i sits at height y once its slow drift is applied. The weft
     calls this too, so every crossing lands on the thread itself. */
  function warpAt(i, y, t) {
    var wp = warps[i];
    return wp.x + Math.sin(t * 0.00021 + i * 0.85 + y * 0.0016) * 1.6;
  }

  function drawWarps(t) {
    for (var i = 0; i < warps.length; i++) {
      var wp = warps[i];
      ctx.beginPath();
      for (var s = 0; s <= SEGS; s++) {
        var y = (H * s) / SEGS;
        disp(warpAt(i, y, t), y);
        if (s === 0) ctx.moveTo(dX, dY); else ctx.lineTo(dX, dY);
      }
      ctx.strokeStyle = 'rgba(' + NAVY + ',' + wp.a + ')';
      ctx.lineWidth = wp.w;
      ctx.stroke();
    }
  }

  /* One weft row: over a standing thread, under the next. That alternation is
     the whole point — it is what makes this cloth rather than a grid. */
  function drawRow(row, t, progress) {
    var alpha = row.base + row.lit;
    if (alpha <= 0.002) return;

    ctx.strokeStyle = 'rgba(' + row.col + ',' + alpha + ')';
    ctx.lineWidth = 1;

    var edge = progress === null ? W + 1 : W * progress;

    for (var i = 0; i < warps.length - 1; i++) {
      var overHere = ((i + row.parity) % 2) === 0;
      var overNext = ((i + 1 + row.parity) % 2) === 0;

      var x1 = warpAt(i, row.y, t) + (overHere ? 0 : FLOAT);
      var x2 = warpAt(i + 1, row.y, t) - (overNext ? 0 : FLOAT);
      if (x2 <= x1) continue;
      if (x1 > edge) break;
      if (x2 > edge) x2 = edge;

      ctx.beginPath();
      var steps = 3;
      for (var s = 0; s <= steps; s++) {
        var x = x1 + ((x2 - x1) * s) / steps;
        disp(x, row.y);
        if (s === 0) ctx.moveTo(dX, dY); else ctx.lineTo(dX, dY);
      }
      ctx.stroke();
    }
  }

  function drawStatic() {
    if (!build()) return;
    ctx.clearRect(0, 0, W, H);
    drawWarps(0);
    for (var i = 0; i < rows.length; i++) drawRow(rows[i], 0, null);
  }

  function frame(now) {
    raf = window.requestAnimationFrame(frame);

    // ease the pointer so the dent glides instead of snapping
    if (cx < -9000) { cx = px; cy = py; }
    cx += (px - cx) * 0.12;
    cy += (py - cy) * 0.12;
    var target = px > -9000 ? 1 : 0;
    strength += (target - strength) * 0.08;

    if (!passStart) passStart = now;
    var elapsed = now - passStart;
    var progress = elapsed / PASS_MS;

    if (progress >= 1) {
      rows[rowN].lit = 0.071;
      if (elapsed > PASS_MS + REST_MS) {
        rowN = (rowN + 1) % rows.length;
        passStart = now;
        progress = 0;
      } else {
        progress = null;
      }
    }

    ctx.clearRect(0, 0, W, H);
    drawWarps(now);

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (i === rowN && progress !== null && progress < 1) {
        row.lit = 0.085 * (1 - progress);
        drawRow(row, now, progress);
      } else {
        row.lit *= 0.985;
        drawRow(row, now, null);
      }
    }
  }

  function start() {
    if (running || reduced.matches) return;
    running = true;
    passStart = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = null;
  }

  hero.addEventListener('pointermove', function (event) {
    var r = hero.getBoundingClientRect();
    px = event.clientX - r.left;
    py = event.clientY - r.top;
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    px = -9999; py = -9999;
  }, { passive: true });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (reduced.matches) drawStatic(); else build();
    }, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  // Only run while the hero is actually on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  }

  if (reduced.matches) {
    drawStatic();
  } else {
    build();
    start();
  }
})();
