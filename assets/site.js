/* Mission 151 — shared runtime
   - Event clock (with optional preview overrides)
   - Live countdown
   - 64-county map renderer
   - Lit-count animator (drives the glowing-county effect during broadcast)
*/

(function () {
  // ---- Event timing ----
  // Real event: May 6, 2026, 7:00 PM Mountain Time. 90-minute broadcast.
  const EVENT_START = new Date('2026-05-06T19:00:00-06:00').getTime();
  const EVENT_END = EVENT_START + 90 * 60 * 1000;

  // Preview override — lets the Tweaks panel force pre / during / post states
  // without changing the wall clock.
  const PREVIEW_KEY = 'm151.previewState';
  function getPreview() {
    try { return localStorage.getItem(PREVIEW_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }
  function setPreview(state) {
    try {
      if (state === 'auto') localStorage.removeItem(PREVIEW_KEY);
      else localStorage.setItem(PREVIEW_KEY, state);
    } catch (e) { }
  }

  function currentPhase(nowOverride) {
    const preview = getPreview();
    if (preview === 'pre') return 'pre';
    if (preview === 'live') return 'live';
    if (preview === 'post') return 'post';
    const now = nowOverride || Date.now();
    if (now < EVENT_START) return 'pre';
    if (now <= EVENT_END) return 'live';
    return 'post';
  }

  function broadcastElapsed() {
    const preview = getPreview();
    if (preview === 'live') {
      // Pretend we're 35 minutes into the show for preview purposes.
      return 35 * 60 * 1000;
    }
    if (preview === 'post') return 90 * 60 * 1000;
    return Date.now() - EVENT_START;
  }

  // ---- Countdown ----
  function tickCountdown(root) {
    const dEl = root.querySelector('[data-cd="d"]');
    const hEl = root.querySelector('[data-cd="h"]');
    const mEl = root.querySelector('[data-cd="m"]');
    const sEl = root.querySelector('[data-cd="s"]');
    if (!dEl) return;
    const diff = Math.max(0, EVENT_START - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    dEl.textContent = String(d).padStart(2, '0');
    hEl.textContent = String(h).padStart(2, '0');
    mEl.textContent = String(m).padStart(2, '0');
    sEl.textContent = String(s).padStart(2, '0');
  }

  function startCountdowns() {
    const roots = document.querySelectorAll('[data-countdown]');
    if (!roots.length) return;
    function loop() {
      roots.forEach(tickCountdown);
    }
    loop();
    setInterval(loop, 1000);
  }

  // ---- 64-county map ----
  // The real product uses Colorado county polygons polled from Airtable; for the
  // mock we keep the abstract grid the reference HTML established (16x10 cells,
  // we use 64 of them to stand in for counties).
  // Indices we drive: dim (pre-registered, "standing by") and lit (live check-in).
  const COUNTIES = [
    'Adams', 'Alamosa', 'Arapahoe', 'Archuleta', 'Baca', 'Bent', 'Boulder', 'Broomfield',
    'Chaffee', 'Cheyenne', 'Clear Creek', 'Conejos', 'Costilla', 'Crowley', 'Custer', 'Delta',
    'Denver', 'Dolores', 'Douglas', 'Eagle', 'El Paso', 'Elbert', 'Fremont', 'Garfield',
    'Gilpin', 'Grand', 'Gunnison', 'Hinsdale', 'Huerfano', 'Jackson', 'Jefferson', 'Kiowa',
    'Kit Carson', 'La Plata', 'Lake', 'Larimer', 'Las Animas', 'Lincoln', 'Logan', 'Mesa',
    'Mineral', 'Moffat', 'Montezuma', 'Montrose', 'Morgan', 'Otero', 'Ouray', 'Park',
    'Phillips', 'Pitkin', 'Prowers', 'Pueblo', 'Rio Blanco', 'Rio Grande', 'Routt', 'Saguache',
    'San Juan', 'San Miguel', 'Sedgwick', 'Summit', 'Teller', 'Washington', 'Weld', 'Yuma'
  ];

  // Layout: a 16x10 cell grid has 160 cells; we lay out 64 counties roughly in
  // a Colorado-ish silhouette (rectangular state, biased denser along the I-25
  // Front Range column). Cell indices are stable so animation is deterministic.
  // We pick 64 cells out of the 160 grid — heavier population in mid columns.
  const GRID_COLS = 16;
  const GRID_ROWS = 10;

  // Roughly weighted picks — denser in cols 7-12 (Front Range) and rows 3-7.
  const COUNTY_CELLS = (function () {
    const cells = [];
    // Build a deterministic seeded layout: full rectangle minus corner thinning.
    // Each county gets one cell. We pick 64 cells aesthetically.
    const candidates = [];
    for (let r = 1; r < GRID_ROWS - 1; r++) {
      for (let c = 1; c < GRID_COLS - 1; c++) {
        candidates.push({ r, c });
      }
    }
    // Sort: prefer center vertically, prefer mid-right horizontally (Front Range)
    candidates.sort((a, b) => {
      const score = (cell) => {
        const dr = Math.abs(cell.r - 4.5);
        const dc = Math.abs(cell.c - 9);
        return dr * 1.4 + dc * 0.6;
      };
      return score(a) - score(b);
    });
    // Take the 64 best, then jitter them into a stable order
    const chosen = candidates.slice(0, 64);
    // Sort back by row,col for readable layout
    chosen.sort((a, b) => a.r === b.r ? a.c - b.c : a.r - b.r);
    return chosen;
  })();

  function renderMap(svgEl, opts) {
    if (!svgEl) return null;
    opts = opts || {};
    const W = 400, H = 200;
    const cellW = W / GRID_COLS;
    const cellH = H / GRID_ROWS;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = '';
    const rects = [];
    COUNTY_CELLS.forEach((cell, i) => {
      const x = cell.c * cellW + 1.5;
      const y = cell.r * cellH + 1.5;
      const w = cellW - 3;
      const h = cellH - 3;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', '1');
      rect.setAttribute('class', 'map-county-dark');
      rect.setAttribute('data-county', COUNTIES[i]);
      rect.setAttribute('data-idx', String(i));
      svgEl.appendChild(rect);
      rects.push(rect);
    });
    return rects;
  }

  function applyMapState(rects, dimSet, litSet) {
    if (!rects) return;
    rects.forEach((r, i) => {
      let cls = 'map-county-dark';
      if (litSet && litSet.has(i)) cls = 'map-county-lit';
      else if (dimSet && dimSet.has(i)) cls = 'map-county-dim';
      r.setAttribute('class', cls);
    });
  }

  // Deterministic preview "lit" sequence — counties light in a believable order
  // (denser counties first), so the same demo timeline plays every load.
  const LIT_ORDER = (function () {
    // Front-range counties first, then growth toward edges.
    // We pre-shuffle by a fixed-seed PRNG so the order looks organic but stable.
    const order = COUNTIES.map((_, i) => i);
    let seed = 1729;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    // Shuffle but bias: counties with lower index in COUNTY_CELLS layout (more
    // central) light up earlier.
    order.sort((a, b) => {
      const ca = COUNTY_CELLS[a], cb = COUNTY_CELLS[b];
      const sa = Math.abs(ca.r - 4.5) + Math.abs(ca.c - 9) * 0.6 + rand() * 2;
      const sb = Math.abs(cb.r - 4.5) + Math.abs(cb.c - 9) * 0.6 + rand() * 2;
      return sa - sb;
    });
    return order;
  })();

  function pickCount(elapsedMs, totalMs, max) {
    const p = Math.max(0, Math.min(1, elapsedMs / totalMs));
    // Ease-out so the early surge feels real, then a long tail.
    const eased = 1 - Math.pow(1 - p, 1.6);
    return Math.round(eased * max);
  }

  function getMapState(opts) {
    const phase = currentPhase();
    const total = 90 * 60 * 1000;
    let standingBy, litCount;

    if (phase === 'pre') {
      // Pre-registrations grow slowly as event approaches.
      standingBy = 41;
      litCount = 0;
    } else if (phase === 'live') {
      const e = Math.max(0, broadcastElapsed());
      litCount = pickCount(e, total, 64);
      // standing-by drains as counties go lit.
      standingBy = Math.max(0, 64 - litCount - Math.round((1 - e / total) * 6));
      if (opts && typeof opts.litOverride === 'number') {
        litCount = Math.max(0, Math.min(64, opts.litOverride));
        standingBy = Math.max(0, 64 - litCount);
      }
    } else {
      // Post-event: all 64 lit
      litCount = 64;
      standingBy = 0;
    }

    const litSet = new Set(LIT_ORDER.slice(0, litCount));
    // dim set = first N pre-registered indices, excluding any already lit
    const dimSet = new Set();
    let added = 0;
    for (let i = 0; i < COUNTIES.length && added < standingBy; i++) {
      if (!litSet.has(i)) { dimSet.add(i); added++; }
    }
    return { phase, litCount, standingBy, litSet, dimSet };
  }

  function paintMaps(opts) {
    const state = getMapState(opts);
    document.querySelectorAll('[data-map]').forEach(svg => {
      let rects = svg.__rects;
      if (!rects) {
        rects = renderMap(svg);
        svg.__rects = rects;
      }
      applyMapState(rects, state.dimSet, state.litSet);
    });
    document.querySelectorAll('[data-lit-count]').forEach(el => {
      el.textContent = String(state.litCount);
    });
    document.querySelectorAll('[data-standing-count]').forEach(el => {
      el.textContent = String(state.standingBy);
    });
    document.querySelectorAll('[data-dark-count]').forEach(el => {
      el.textContent = String(64 - state.litCount - state.standingBy);
    });
    document.querySelectorAll('[data-map-meta]').forEach(el => {
      if (state.phase === 'pre') {
        el.textContent = `${state.standingBy} STANDING BY · 0 / 64 LIT`;
      } else if (state.phase === 'live') {
        el.textContent = `${state.standingBy} STANDING BY · ${state.litCount} / 64 LIT`;
      } else {
        el.textContent = `64 / 64 LIT — MAY 6, 2026`;
      }
    });
    return state;
  }

  // ---- Phase-driven UI swapping ----
  function applyPhase() {
    const phase = currentPhase();
    document.documentElement.setAttribute('data-phase', phase);
    document.querySelectorAll('[data-show-phase]').forEach(el => {
      const allowed = el.getAttribute('data-show-phase').split(/\s+/);
      el.style.display = allowed.includes(phase) ? '' : 'none';
    });
    // Optional preview pill
    const pill = document.querySelector('.preview-state-pill');
    const preview = getPreview();
    if (pill) {
      if (preview === 'auto') pill.style.display = 'none';
      else {
        pill.style.display = 'block';
        pill.textContent = `PREVIEW · ${preview.toUpperCase()}`;
      }
    }
  }

  // ---- Init ----
  function init() {
    applyPhase();
    startCountdowns();
    paintMaps();
    // Re-paint the map periodically during the live phase so the count animates.
    setInterval(() => {
      const phase = currentPhase();
      if (phase === 'live') paintMaps();
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- Public API for Tweaks panel ----
  window.M151 = {
    getPhase: currentPhase,
    setPreview: function (state) { setPreview(state); applyPhase(); paintMaps(); },
    getPreview: getPreview,
    counties: COUNTIES,
    paintMaps: paintMaps,
    EVENT_START: EVENT_START,
    EVENT_END: EVENT_END,
  };
})();


(function () {
  var d = document;
  var w = "https://tally.so/widgets/embed.js";

  function loadTally() {
    if (typeof Tally !== "undefined") {
      Tally.loadEmbeds();
    } else {
      d.querySelectorAll('iframe[data-tally-src]:not([src])').forEach(function (el) {
        el.src = el.dataset.tallySrc;
      });
    }
  }

  if (typeof Tally !== "undefined") {
    loadTally();
    return;
  }

  if (!d.querySelector('script[src="' + w + '"]')) {
    var s = d.createElement("script");
    s.src = w;
    s.async = true;
    s.onload = loadTally;
    s.onerror = loadTally;
    d.body.appendChild(s);
  }
})();

const toggleBtn = document.querySelector('.navBarToggleBtn');
const navWrapper = document.querySelector('.navBarToggleWrapper');

if (toggleBtn && navWrapper) {
  toggleBtn.addEventListener('click', () => {
    navWrapper.classList.toggle('active');
  });
}
