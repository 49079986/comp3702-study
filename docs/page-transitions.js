/* Adapted from INFS 7903/Study/assets/page-transitions.js (2026-10-27).
   Native document navigation and the existing hash routers remain authoritative. */
'use strict';
(() => {
  const html = document.documentElement;
  const base = new URL('./', document.currentScript.src);
  const key = 'comp3702-page-transition-v1', settingKey = 'comp3702-page-motion';
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const lessons = new Set(['intro', 'table', 'update', 'episode', 'features', 'weights', 'evidence', 'explain']);
  const pages = new Set(['home', 'learn', 'a3', 'assignments', 'lab', 'practice', 'english', 'sources', 'plan', 'formulas']);
  const animations = new Set();
  let disabledByUser = false, printing = false, layer = null, revision = 0;
  let previousURL = null, departure = null, intent = null;
  try { disabledByUser = localStorage.getItem(settingKey) === 'off'; } catch {}
  const disabled = () => disabledByUser || preference?.matches || printing || document.hidden;
  const main = () => document.getElementById('main') || document.getElementById('a3-root');
  function canonical(value) {
    const url = new URL(value, location.href);
    if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    return url;
  }
  function route(value) {
    const url = canonical(value);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !['http:', 'https:', 'file:'].includes(url.protocol)) return null;
    const path = url.pathname.slice(base.pathname.length), hash = url.hash.slice(1);
    if (path === 'a3/index.html') return !hash || lessons.has(hash) ? {url, a3: true} : null;
    if (path === 'index.html' && (!hash || pages.has(hash.split('/')[0]))) return {url, a3: hash.split('/')[0] === 'a3'};
    return null;
  }
  function classify(from, to) {
    try {
      const a = route(from), b = route(to);
      if (!a || !b || a.url.href === b.url.href) return 'none';
      return b.a3 && !a.a3 ? 'pixel' : 'lesson';
    } catch { return 'none'; }
  }
  function clearPending() { try { sessionStorage.removeItem(key); } catch {} }
  function store(item) { try { sessionStorage.setItem(key, JSON.stringify(item)); return true; } catch { return false; } }
  function readPending() {
    try {
      const item = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (!item || !['pixel', 'lesson'].includes(item.kind) || Date.now() - item.time > 8000 || Date.now() < item.time) return null;
      return canonical(item.to).href === canonical(location.href).href ? item : null;
    } catch { return null; }
  }
  const arrival = readPending();
  clearPending();
  function reset() {
    revision++;
    for (const animation of animations) animation.cancel();
    animations.clear();
    layer?.remove(); layer = null; departure = null;
    html.dataset.motionPhase = 'idle';
  }
  function idle(ticket, item) {
    if (ticket !== revision) return;
    reset();
    if (item?.keyboard) main()?.focus({preventScroll: true});
  }
  function animate(element, frames, options) {
    try {
      const animation = element.animate(frames, options);
      animations.add(animation);
      return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    } catch { return Promise.resolve(); }
  }
  function pixels(open) {
    const region = main();
    if (!region?.animate) return Promise.resolve();
    const rect = region.getBoundingClientRect();
    const header = document.querySelector('.topbar')?.getBoundingClientRect();
    const top = Math.max(0, header?.bottom || 0, rect.top), left = Math.max(0, rect.left);
    const width = Math.min(innerWidth, rect.right) - left, height = Math.min(innerHeight, rect.bottom) - top;
    if (height < 40 || width < 80) return Promise.resolve();
    const cols = Math.min(14, Math.max(5, Math.round(width / 78)));
    const rows = Math.min(11, Math.max(2, Math.ceil(height / (width / cols))));
    const node = document.createElement('div');
    node.className = 'page-pixel-layer'; node.setAttribute('aria-hidden', 'true');
    Object.assign(node.style, {left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`});
    document.body.append(node); layer = node;
    const promises = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = document.createElement('i'); cell.className = 'page-pixel';
      cell.style.background = ['#1c1712', '#34251b', '#7c5338', '#bf8b58'][(x * 7 + y * 3) % 4];
      node.append(cell);
      promises.push(animate(cell, open ?
        [{opacity: 1, transform: 'scale(1.035)'}, {opacity: 0, transform: 'scale(.08)'}] :
        [{opacity: 0, transform: 'scale(.08)'}, {opacity: 1, transform: 'scale(1.035)'}],
      {duration: open ? 220 : 135, delay: Math.round((x + y * .65) / (cols + rows * .65) * 100), easing: open ? 'cubic-bezier(.2,.7,.2,1)' : 'cubic-bezier(.55,0,.35,1)', fill: 'both'}));
    }
    // A suspended or unavailable animation must never block navigation.
    return Promise.race([Promise.all(promises), new Promise(resolve => setTimeout(resolve, open ? 380 : 290))]);
  }
  function enter(item) {
    reset();
    if (!item || item.kind === 'none' || disabled()) return;
    const ticket = revision;
    html.dataset.motionKind = item.kind; html.dataset.motionPhase = 'enter'; html.dataset.motionEngine = 'web-animations';
    if (item.kind === 'pixel') { pixels(true).finally(() => idle(ticket, item)); return; }
    const region = main()?.querySelector('.a3-main-column') || main();
    if (!region?.animate) { idle(ticket, item); return; }
    Promise.race([
      animate(region, [{opacity: 0, transform: 'translateY(10px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)'}),
      new Promise(resolve => setTimeout(resolve, 380))
    ]).finally(() => idle(ticket, item));
  }
  // Called after the existing router has mounted content and scrolled to its start.
  function afterRoute() {
    const to = location.href;
    if (previousURL === to) return;
    const item = previousURL ? {kind: classify(previousURL, to), keyboard: intent?.to === to && intent.keyboard} : arrival;
    previousURL = to; intent = null; clearPending();
    enter(item);
  }
  function leave(to, keyboard = false, event = null) {
    reset(); intent = null; clearPending();
    const item = {kind: classify(location.href, to), to: new URL(to, location.href).href, time: Date.now(), keyboard};
    if (disabled() || item.kind === 'none') return false;
    const a = canonical(location.href), b = canonical(item.to);
    const sameDocument = a.pathname === b.pathname && a.search === b.search;
    const stored = sameDocument || store(item);
    intent = item;
    if (item.kind !== 'pixel' || !stored || !main()?.animate) return false;
    event?.preventDefault(); departure = item;
    const ticket = revision;
    html.dataset.motionKind = 'pixel'; html.dataset.motionPhase = 'leave'; html.dataset.motionEngine = 'web-animations';
    pixels(false).finally(() => { if (ticket === revision && departure === item) { departure = null; location.assign(item.to); } });
    return true;
  }
  function navigate(to) { if (!leave(to, true)) location.assign(to); }
  function updateButtons() {
    html.dataset.motionDisabled = String(!!disabled());
    document.querySelectorAll('[data-page-motion]').forEach(button => {
      button.innerHTML = `<span class="lang-zh">转场：${disabled() ? '关' : '开'}</span><span class="lang-en" lang="en">Motion: ${disabled() ? 'off' : 'on'}</span>`;
      button.setAttribute('aria-pressed', String(!disabled()));
      button.title = preference?.matches ? '已跟随系统“减少动态效果”设置 / Reduced motion' : '开关页面转场 / Toggle page transitions';
    });
    if (disabled()) {
      const destination = departure?.to;
      reset(); intent = null; clearPending();
      if (destination) location.assign(destination);
    }
  }
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-page-motion]')) {
      disabledByUser = !disabledByUser;
      try { localStorage.setItem(settingKey, disabledByUser ? 'off' : 'on'); } catch {}
      updateButtons(); return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self' || anchor.hasAttribute('data-no-transition')) return;
    leave(anchor.href, event.detail === 0, event);
  });
  if (preference?.addEventListener) preference.addEventListener('change', updateButtons);
  else preference?.addListener?.(updateButtons);
  addEventListener('storage', event => { if (event.key === settingKey || event.key === null) { try { disabledByUser = localStorage.getItem(settingKey) === 'off'; } catch {} updateButtons(); } });
  addEventListener('pagehide', () => { reset(); intent = null; });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      previousURL = location.href; intent = null; clearPending(); reset();
      try { disabledByUser = localStorage.getItem(settingKey) === 'off'; } catch {}
      updateButtons();
    }
  });
  addEventListener('beforeprint', () => { printing = true; updateButtons(); });
  addEventListener('afterprint', () => { printing = false; updateButtons(); });
  document.addEventListener('visibilitychange', updateButtons);
  window.StudyTransitions = {navigate, afterRoute};
  updateButtons();
})();
