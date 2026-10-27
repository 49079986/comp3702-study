// Dependency-free deterministic tests of the visual enhancement, not a browser driver.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'docs', 'motion.js'), 'utf8');

class Element {
  constructor(className='') {
    this.nodeType=1; this.className=className; this.children=[]; this.dataset={};
    this.isConnected=true; this.textContent=''; this.attrs={}; this.properties={};
    this.classList={
      contains:name=>this.className.split(' ').includes(name),
      add:name=>{if(!this.classList.contains(name))this.className=(this.className+' '+name).trim();},
      remove:name=>{this.className=this.className.split(' ').filter(n=>n!==name).join(' ');}
    };
    this.style={setProperty:(k,v)=>{this.properties[k]=v;},removeProperty:k=>{delete this.properties[k];}};
  }
  appendChild(node){this.children.push(node);return node;}
  matches(selector){return selector==='[data-count-key]'?!!this.dataset.countKey:this.classList.contains(selector.slice(1));}
  querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  closest(selector){return this.matches(selector)?this:null;}
  contains(node){return node===this||this.children.some(c=>c.contains(node));}
  getBoundingClientRect(){return {left:50,top:20,width:300,height:180};}
}
function number(key,value,suffix='') {
  const el=new Element();el.dataset={countKey:key,countValue:String(value),countSuffix:suffix};
  const final=new Element('number-final');final.textContent=String(value)+suffix;el.appendChild(final);return el;
}
function fixture(initial=12, unavailable=false){
  let now=0,next=1,observer;
  const frames=new Map(),events=new Map(),body=new Element();
  const listeners=(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn);};
  const media=new Map();
  const matchMedia=query=>{
    if(!media.has(query))media.set(query,{matches:query.includes('pointer'),handlers:[],addEventListener(_,fn){this.handlers.push(fn);}});
    return media.get(query);
  };
  const element=body.appendChild(number('mastery',initial));
  const document={body,readyState:'complete',hidden:false,createElement:()=>new Element(),addEventListener:listeners};
  const window={matchMedia,MutationObserver:class{},requestAnimationFrame:unavailable?null:()=>{},addEventListener:listeners};
  const context={window,document,Node:Element,performance:{now:()=>now},
    requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},
    cancelAnimationFrame:id=>frames.delete(id),
    MutationObserver:class {constructor(fn){observer=fn;}observe(){}}};
  vm.runInNewContext(source,context,{filename:'motion.js'});
  return {element,body,document,frames,
    update(el,value){el.dataset.countValue=String(value);el.querySelector('.number-final').textContent=String(value)+(el.dataset.countSuffix||'');observer([{type:'attributes',target:el}]);},
    attach(el){body.appendChild(el);observer([{type:'childList',addedNodes:[el]}]);},
    advance(ms){now+=ms;const work=[...frames.values()];frames.clear();for(const fn of work)fn(now);},
    fire(type,event={}){for(const fn of events.get(type)||[])fn(event);},
    preference(query,value){const m=matchMedia(query);m.matches=value;for(const fn of m.handlers)fn();}
  };
}
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++;}
const f=fixture();
check(f.frames.size===0,'Initial load does not count up from zero');
check(f.element.querySelector('.number-final').textContent==='12','Canonical saved value present immediately');
f.update(f.element,24);
check(f.element.querySelector('.number-final').textContent==='24','Semantic value changes synchronously');
check(f.element.querySelector('.number-visual').textContent==='12','Visual transition starts at previous value');
f.advance(180);
check(Number(f.element.querySelector('.number-visual').textContent)>12,'Intermediate frame progresses');
const visible=f.element.querySelector('.number-visual').textContent;
const replacement=number('mastery',24);
f.element.isConnected=false;f.attach(replacement);
check(replacement.querySelector('.number-visual').textContent===visible,'Route replacement preserves current frame');
f.advance(180);
check(!replacement.classList.contains('is-counting')&&f.frames.size===0,'Animation stops at exact final value');
const same=number('mastery',24);f.attach(same);
check(!same.classList.contains('is-counting')&&f.frames.size===0,'Same value on another page does not replay');
f.update(same,80);f.advance(100);
const from=Number(same.querySelector('.number-visual').textContent);
f.update(same,10);
check(Number(same.querySelector('.number-visual').textContent)===from,'Rapid reversal continues from displayed value');
f.advance(360);
check(same.querySelector('.number-final').textContent==='10'&&f.frames.size===0,'Rapid update finishes accurately');
const percent=number('accuracy',25,'%');f.attach(percent);f.update(percent,100);f.advance(360);
check(percent.querySelector('.number-final').textContent==='100%','Percentage formatting preserves exact result');
check(percent.querySelector('.number-visual').attrs['aria-hidden']==='true','Animation is hidden from assistive technology');
check(percent.querySelector('.number-visual').attrs.hidden==='','Missing enhancement CSS keeps the visual duplicate hidden');
f.update(same,20);f.fire('beforeprint');
check(!same.classList.contains('is-counting')&&f.frames.size===0,'Printing flushes visual transitions');
f.fire('afterprint');f.update(same,30);f.preference('(prefers-reduced-motion: reduce)',true);
check(!same.classList.contains('is-counting')&&f.frames.size===0,'Changed reduced-motion preference ends animation');
f.update(same,40);
check(!same.classList.contains('is-counting')&&same.querySelector('.number-final').textContent==='40','Reduced motion uses static exact value');
f.preference('(prefers-reduced-motion: reduce)',false);
f.update(same,50);f.document.hidden=true;f.fire('visibilitychange');
check(f.frames.size===0&&!same.classList.contains('is-counting'),'Background tabs do not keep animating');
f.document.hidden=false;
const card=new Element('topic-card');
f.fire('pointermove',{target:card,pointerType:'mouse',clientX:60,clientY:40});
f.fire('pointermove',{target:card,pointerType:'mouse',clientX:140,clientY:90});
check(f.frames.size===1,'Pointer updates are batched into one frame');
f.advance(16);
check(card.properties['--spot-x']==='90px'&&card.properties['--spot-y']==='70px','Spotlight uses latest pointer position');
f.fire('pointerout',{relatedTarget:null});
check(!card.attrs['data-spotlight']&&f.frames.size===0,'Pointer exit clears the light and pending work');
f.fire('pointermove',{target:card,pointerType:'touch',clientX:90,clientY:40});
check(f.frames.size===0,'Touch input does not start mouse tracking');
const fallback=fixture(37,true);
check(fallback.element.querySelector('.number-final').textContent==='37'&&!fallback.element.classList.contains('is-counting'),'Missing enhancement APIs leave canonical content readable');
console.log(JSON.stringify({checks,status:'passed',duration_ms:360,scope:'visual transitions, route replacement, rapid updates, accessibility, print, reduced motion, pointer lifecycle'},null,2));
