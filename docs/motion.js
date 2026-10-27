/* Native, offline enhancements. This module never reads/writes learning storage.
   Inspirations: https://www.reactbits.dev/components/spotlight-card
                 https://www.reactbits.dev/text-animations/count-up */
'use strict';
(() => {
  if (!window.matchMedia || !window.requestAnimationFrame || !window.MutationObserver) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const counts = new Map();
  const bindings = new WeakMap();
  const DURATION = 360;
  let countFrame = 0, spotFrame = 0, pointer = null, litCard = null, printing = false;
  const canAnimate = () => !reduced.matches && !document.hidden && !printing;
  const formatted = (entry, value) => value.toFixed(entry.decimals) + entry.suffix;

  function restore(element) {
    element.classList.remove('is-counting');
  }
  function draw(entry, value) {
    for (const element of entry.elements) {
      if (!element.isConnected) { entry.elements.delete(element); continue; }
      if (!entry.running) { restore(element); continue; }
      const visual = element.querySelector('.number-visual');
      if (visual) {
        visual.textContent = formatted(entry, value);
        element.classList.add('is-counting');
      }
    }
  }
  function finish(entry) {
    entry.display = entry.target;
    entry.running = false;
    draw(entry, entry.target);
  }
  function tick(now) {
    countFrame = 0;
    let running = false;
    try {
      for (const entry of counts.values()) {
        if (!entry.running) continue;
        const fraction = Math.min(1, Math.max(0, (now - entry.started) / DURATION));
        if (!canAnimate() || fraction === 1) { finish(entry); continue; }
        entry.display = entry.from + (entry.target - entry.from) * (1 - Math.pow(1 - fraction, 3));
        draw(entry, entry.display);
        running = true;
      }
      if (running) countFrame = requestAnimationFrame(tick);
    } catch (_) { finishAll(); }
  }
  function finishAll() {
    if (countFrame) cancelAnimationFrame(countFrame);
    countFrame = 0;
    for (const entry of counts.values()) finish(entry);
  }
  function bind(element) {
    const key = element.dataset.countKey;
    const target = Number(element.dataset.countValue);
    const decimals = Number(element.dataset.countDecimals || 0);
    const suffix = element.dataset.countSuffix || '';
    if (!key || !Number.isFinite(target) || !Number.isInteger(decimals) || decimals < 0 || decimals > 3) return;
    const final = element.querySelector('.number-final');
    if (!final) return;
    const priorBinding = bindings.get(element);
    if (priorBinding?.key === key && priorBinding.target === target) return;
    if (priorBinding) counts.get(priorBinding.key)?.elements.delete(element);
    let entry = counts.get(key);
    if (!entry) {
      // First observation uses the real saved value; never count up from zero.
      entry = {target, display:target, from:target, decimals, suffix, running:false, elements:new Set()};
      counts.set(key, entry);
    }
    if (!element.querySelector('.number-visual')) {
      const visual = document.createElement('span');
      visual.className = 'number-visual';
      visual.setAttribute('hidden', ''); // No duplicate text if enhancement CSS fails to load.
      visual.setAttribute('aria-hidden', 'true');
      element.appendChild(visual);
    }
    entry.elements.add(element);
    bindings.set(element, {key, target});
    entry.decimals = decimals;
    entry.suffix = suffix;
    if (target !== entry.target) {
      entry.from = entry.display;
      entry.target = target;
      entry.started = performance.now();
      entry.running = canAnimate() && entry.from !== target;
    }
    if (!canAnimate()) finish(entry);
    else draw(entry, entry.display);
    if (entry.running && !countFrame) countFrame = requestAnimationFrame(tick);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches('[data-count-key]')) bind(root);
    for (const element of root.querySelectorAll('[data-count-key]')) bind(element);
  }
  function clearSpot() {
    if (spotFrame) cancelAnimationFrame(spotFrame);
    spotFrame = 0;
    pointer = null;
    if (litCard) {
      litCard.removeAttribute('data-spotlight');
      litCard.style.removeProperty('--spot-x');
      litCard.style.removeProperty('--spot-y');
      litCard = null;
    }
  }
  function paintSpot() {
    spotFrame = 0;
    if (!pointer || !pointer.card.isConnected || !canAnimate() || !finePointer.matches) { clearSpot(); return; }
    const {card, x, y} = pointer;
    if (litCard && litCard !== card) litCard.removeAttribute('data-spotlight');
    litCard = card;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${Math.round(x - rect.left)}px`);
    card.style.setProperty('--spot-y', `${Math.round(y - rect.top)}px`);
    card.setAttribute('data-spotlight', 'active');
  }
  function initialise() {
    try {
      scan(document.body);
      const observer = new MutationObserver(records => {
        try {
          for (const record of records) {
            if (record.type === 'attributes') bind(record.target);
            else for (const node of record.addedNodes) scan(node);
          }
        } catch (_) { finishAll(); }
      });
      observer.observe(document.body, {childList:true, subtree:true, attributes:true,
        attributeFilter:['data-count-key', 'data-count-value']});
      document.addEventListener('pointermove', event => {
        if (!canAnimate() || !finePointer.matches || event.pointerType === 'touch') return;
        const card = event.target.closest?.('.topic-card');
        if (!card) { if (litCard) clearSpot(); return; }
        pointer = {card, x:event.clientX, y:event.clientY};
        if (!spotFrame) spotFrame = requestAnimationFrame(paintSpot);
      }, {passive:true});
      document.addEventListener('pointerout', event => {
        if (litCard && (!(event.relatedTarget instanceof Node) || !litCard.contains(event.relatedTarget))) clearSpot();
      }, {passive:true});
      document.addEventListener('pointercancel', clearSpot, {passive:true});
      document.addEventListener('focusin', event => {
        if (event.target.closest?.('.topic-card')) clearSpot();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { finishAll(); clearSpot(); }
      });
      window.addEventListener('blur', clearSpot);
      window.addEventListener('pagehide', () => { finishAll(); clearSpot(); });
      window.addEventListener('beforeprint', () => { printing = true; finishAll(); clearSpot(); });
      window.addEventListener('afterprint', () => { printing = false; scan(document.body); });
      const preferencesChanged = () => { finishAll(); clearSpot(); };
      for (const query of [reduced, finePointer]) {
        if (query.addEventListener) query.addEventListener('change', preferencesChanged);
        else if (query.addListener) query.addListener(preferencesChanged); // Older Safari
      }
    } catch (_) {
      finishAll();
      clearSpot();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, {once:true});
  else initialise();
})();
