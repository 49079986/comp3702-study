// Exercise navigation races and accessibility fallbacks without a browser driver.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'docs', 'page-transitions.js'), 'utf8');
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture({url = 'https://study.test/index.html', blocked = false, reduced = false, arrival = null, api = true} = {}) {
  const events = new Map(), active = new Set(), calls = [], assigned = [], timers = [];
  const local = new Map(), session = new Map();
  if (arrival) session.set('comp3702-page-transition-v1', JSON.stringify(arrival));
  const on = (name, fn) => { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); };
  const fire = (name, event = {}) => (events.get(name) || []).forEach(fn => fn(event));
  class Element {
    constructor(className = '') { this.className = className; this.style = {}; this.children = []; this.attrs = {}; this.focused = 0; }
    append(child) { this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    setAttribute(key, value) { this.attrs[key] = value; }
    getBoundingClientRect() { return {top: 100, left: 40, right: 1100, bottom: 1000}; }
    focus() { this.focused++; }
    animate(frames, options) {
      let resolve;
      const result = {finished: new Promise(r => { resolve = r; }), cancel() { active.delete(result); resolve(); }};
      active.add(result); calls.push({target: this, frames, options}); return result;
    }
  }
  if (!api) Element.prototype.animate = undefined;
  const body = new Element(), main = new Element('main'), column = new Element('a3-main-column'), toggle = new Element();
  main.querySelector = () => column;
  const preference = {matches: reduced, addEventListener: (_, fn) => on('preference', fn)};
  const storage = values => ({getItem(key) { if (blocked) throw Error('blocked'); return values.get(key) || null; }, setItem(key, value) { if (blocked) throw Error('blocked'); values.set(key, value); }, removeItem(key) { if (blocked) throw Error('blocked'); values.delete(key); }});
  const location = {href: url, assign(to) { assigned.push(to); }};
  const script = new URL(new URL(url).pathname.endsWith('/a3/index.html') ? '../page-transitions.js' : './page-transitions.js', url).href;
  const document = {documentElement: {dataset: {}}, body, hidden: false, currentScript: {src: script},
    getElementById: id => id === 'main' || id === 'a3-root' ? main : null,
    querySelector: () => ({getBoundingClientRect: () => ({bottom: 90})}),
    querySelectorAll: () => [toggle], createElement: () => new Element(), addEventListener: on};
  const context = {document, location, URL, Date, Promise, Set, localStorage: storage(local), sessionStorage: storage(session), innerWidth: 1200, innerHeight: 800, addEventListener: on, setTimeout: fn => timers.push(fn)};
  context.window = context; context.matchMedia = () => preference;
  vm.runInNewContext(source, context, {filename: 'page-transitions.js'});
  const click = (to, options = {}) => {
    const anchor = {href: new URL(to, location.href).href, target: options.target || '', hasAttribute: name => !!options[name]};
    const event = {button: 0, detail: 1, defaultPrevented: false, target: {closest: selector => selector === 'a[href]' ? anchor : null}, preventDefault() { this.defaultPrevented = true; }, ...options};
    fire('click', event); return event;
  };
  return {document, main, column, toggle, calls, active, assigned, body, local, session, preference, fire, click,
    route(to = location.href) { location.href = new URL(to, location.href).href; context.StudyTransitions.afterRoute(); },
    async finish() { for (const animation of [...active]) animation.cancel(); await flush(); },
    async timeout() { timers.splice(0).forEach(fn => fn()); await flush(); },
    toggleMotion() { fire('click', {target: {closest: selector => selector === '[data-page-motion]' ? toggle : null}}); }};
}
(async () => {
  let f = fixture(); f.route();
  check(f.calls.length === 0, 'Cold load keeps content static');
  const entry = f.click('#a3/intro', {detail: 0});
  check(entry.defaultPrevented && f.assigned.length === 0 && f.body.children.length === 1, 'Pixel cover precedes native navigation');
  await f.finish();
  check(f.assigned[0].endsWith('#a3/intro'), 'Pixel completion follows the intended URL');
  f.route(f.assigned[0]);
  check(f.document.documentElement.dataset.motionKind === 'pixel' && f.body.children.length === 1, 'Mounted destination gets pixel reveal');
  await f.finish();
  check(f.body.children.length === 0 && f.main.focused === 1, 'Pixel cleanup restores keyboard focus');
  const lesson = f.click('#a3/table'); f.route('#a3/table');
  check(!lesson.defaultPrevented && f.calls.at(-1).target === f.column && f.calls.at(-1).options.duration === 260, 'Lesson navigation animates content while navigation stays static');
  await f.finish();
  check(f.document.documentElement.dataset.motionPhase === 'idle' && f.active.size === 0, 'Lesson completion releases animations');
  f.route('#home'); await f.finish(); f.click('#a3/intro'); f.click('#learn/agent'); f.route('#learn/agent'); await f.finish();
  check(f.assigned.length === 1 && f.body.children.length === 0, 'A newer destination cancels a pending pixel departure');
  f.click('#a3/intro'); f.toggleMotion(); await f.finish();
  check(f.assigned.length === 2 && f.local.get('comp3702-page-motion') === 'off', 'Disabling during departure completes navigation immediately and persists choice');
  const before = f.calls.length; f.route('#a3/intro');
  check(f.calls.length === before && f.body.children.length === 0, 'Disabled navigation is immediate and static');

  f = fixture({reduced: true}); f.route(); f.route('#a3/intro');
  check(f.calls.length === 0 && f.toggle.attrs['aria-pressed'] === 'false', 'System reduced motion overrides the user toggle');
  f.preference.matches = false; f.fire('preference'); f.route('#a3/table');
  f.preference.matches = true; f.fire('preference'); await f.finish();
  check(f.active.size === 0 && f.body.children.length === 0, 'Changing system preference cancels active effects');

  for (const protocol of ['https://study.test/', 'file:///C:/study/']) {
    f = fixture({url: protocol + 'index.html', blocked: true}); f.route();
    check(f.click('#a3/intro').defaultPrevented, 'Hash navigation works with blocked storage: ' + protocol);
    await f.finish(); f.route('#a3/intro'); await f.finish();
    check(!f.click('a3/index.html').defaultPrevented, 'Cross-document navigation stays native with blocked storage: ' + protocol);
  }
  f = fixture({api: false}); f.route();
  check(!f.click('#a3/intro').defaultPrevented, 'Missing animation API never delays navigation');
  f.route('#a3/intro'); await flush();
  check(f.body.children.length === 0, 'Missing animation API leaves no overlay');

  f = fixture(); f.route();
  for (const options of [{ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}, {target: '_blank'}, {download: true}, {'data-no-transition': true}]) {
    check(!f.click('#a3/intro', options).defaultPrevented && f.calls.length === 0, 'Preserve native click ' + JSON.stringify(options));
  }
  check(!f.click('#main').defaultPrevented && !f.click('https://external.test/').defaultPrevented && !f.click('print/handbook.html').defaultPrevented, 'Anchors, external links and printable resources stay native');
  f.click('#a3/intro'); await f.timeout();
  check(f.assigned.length === 1, 'Watchdog completes navigation even if animations never finish');
  f.route('#a3/intro'); f.fire('beforeprint'); await flush();
  check(f.active.size === 0 && f.body.children.length === 0, 'Printing cancels and clears effects');
  f.fire('afterprint'); f.route('#a3/table'); f.fire('pageshow', {persisted: true}); await flush();
  check(f.active.size === 0 && f.document.documentElement.dataset.motionPhase === 'idle', 'Back-forward cache restoration returns to idle');

  const url = 'https://study.test/a3/index.html';
  f = fixture({url, arrival: {kind: 'pixel', to: url, time: Date.now(), keyboard: true}}); f.route();
  check(f.calls.length > 0 && f.session.size === 0, 'Cross-document arrival consumes its transition once');
  await f.finish(); check(f.main.focused === 1, 'Cross-document keyboard arrival focuses main');
  f = fixture({url, arrival: {kind: 'pixel', to: url, time: Date.now() - 9000}}); f.route();
  check(f.calls.length === 0, 'Stale arrival never replays');
  console.log(JSON.stringify({status: 'passed', checks, scope: 'native navigation, async races, keyboard focus, reduced motion, storage failures, offline URLs, missing APIs, print and browser cache'}, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
