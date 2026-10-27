'use strict';
// Run with Node. Compares browser maths with independently recorded Python outputs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..','docs'),C=require('../docs/a3-core.js'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'a3-data.js'),'utf8'),sandbox);
const D=JSON.parse(JSON.stringify(sandbox.window.A3_DATA));
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('244 feature vectors agree with real Python, including all coordinates',()=>{
  const fixtures=JSON.parse(fs.readFileSync(path.join(root,'docs/a3_feature_fixtures.json'),'utf8'));
  assert.equal(fixtures.length,244);const models=new Map(D.maps.map(m=>[m.id,C.featureModel(m)]));
  for(const x of fixtures){const y=models.get(x.map).features(x.state,x.action);assert.equal(y.normalised.length,21);y.normalised.forEach((v,i)=>near(v,x.features[i]));near(C.dot(y.normalised,y.normalised),1);}
});
test('nonterminal Q update and terminal no-bootstrap update',()=>{
  near(C.qUpdate(1,-2,.9,.2,5).value,1.3);near(C.qUpdate(1,-2,.9,.2,10000,true).value,.4);
  near(C.qUpdate(1,-2,.9,0,5).value,1);near(C.qUpdate(1,-2,.9,1,5).value,2.5);
});
test('weight coordinates use the same old TD error',()=>{
  const x=C.weightUpdate([0,0],[1,.5],-2,.9,.1,10000,true);
  near(x.nextWeights[0],-.2);near(x.nextWeights[1],-.1);near(x.nextQ,-.25);
  assert.deepEqual(x.weights,[0,0]);near(C.dot([2,-1],[.5,.25]),.75);
});
test('classroom map: six right actions collect and finish, rewards are not shaped',()=>{
  let state=C.initial(C.TOY),reward=0;for(let i=0;i<6;i++){const x=C.toyStep(state,'r');state=x.state;reward+=x.reward;}
  assert.equal(reward,-6);assert.equal(C.terminal(C.TOY,state),true);assert.deepEqual(state.crystals,[1,0]);
  const end=C.toyStep(state,'r');assert.equal(end.reward,0);assert.deepEqual(end.state,state);
  const wall=C.toyStep(C.initial(C.TOY),'u');assert.equal(wall.blocked,true);assert.equal(wall.reward,-1.5);assert.equal(wall.state.row,1);
  assert.deepEqual(C.validActions(C.TOY,{row:3,col:2}),['jl','jr','ju','jd']);
});
test('epsilon boundaries, evaluation ignores exploration, ties stay deterministic',()=>{
  near(C.epsilon(0,100),.25);near(C.epsilon(80,100),.02);near(C.epsilon(100,100),.02);
  assert.equal(C.choose([-6,-2,-4],.25,.25,0).index,1);
  assert.equal(C.choose([-6,-2,-4],1,.9,0).index,0);
  assert.equal(C.choose([-2,-2,-4],1,0,.9,'evaluate').index,0);
});
test('moving averages use the right startup denominator',()=>{
  const y=C.movingAverage([-12,-8,-14,-5],3);[-12,-10,-34/3,-9].forEach((v,i)=>near(y[i],v));
});
test('24 replay transitions match real solver observations',()=>{
  assert.equal(D.trace.length,24);
  for(const r of D.trace){near(r.newQ,r.observedQ);near(r.newQ,r.oldQ+r.alpha*(r.target-r.oldQ));}
  assert.notEqual(D.trace[0].epsilon,D.trace[12].epsilon);
  for(let i=1;i<24;i++)if(D.trace[i].episode===D.trace[i-1].episode)assert.deepEqual(D.trace[i].state,D.trace[i-1].next);
});
test('all 15 curves preserve original CSV values, including 50-episode mean',()=>{
  assert.equal(D.curves.length,15);
  for(const c of D.curves){const lines=fs.readFileSync(path.join(root,c.csv),'utf8').trim().replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.split(',')),header=lines.shift(),rows=lines.map(x=>Object.fromEntries(header.map((h,i)=>[h,Number(x[i])])));
    const means=C.movingAverage(rows.map(r=>r.reward),50);assert.ok(c.points.length<=180);
    for(const p of c.points){const r=rows[p.episode-1];near(p.reward,r.reward);near(p.mean,r.moving_average_50);near(p.mean,means[p.episode-1]);assert.equal(p.steps,r.training_steps);}
  }
});
test('generated source snippets and sample hash match unchanged Python',()=>{
  const source=fs.readFileSync(path.join(root,'assignments/a3/code/solution.py'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),D.sourceSha256);
  const lines=source.toString('utf8').split(/\r?\n/);for(const section of Object.values(D.sections))if(!section.file)for(const l of section.lines)assert.equal(l.text,lines[l.number-1]);
});
test('standalone document has exclusively local runtime resources',()=>{
  const page=fs.readFileSync(path.join(root,'a3/index.html'),'utf8');
  for(const m of page.matchAll(/(?:src|href)="([^"]+)"/g)){if(m[1].startsWith('#'))continue;assert.ok(!/^https?:/.test(m[1]));const file=decodeURI(m[1].split(/[?#]/)[0]);assert.ok(fs.existsSync(path.resolve(root,'a3',file)),file);}
});
function unitHarness(reduce=false,unavailableStorage=false){
  const docEvents={},events={},nodes=new Map(),timers=new Set(),stored=new Map();
  const media={matches:reduce,addEventListener:(name,fn)=>media.changed=fn};
  const play={disabled:false,setAttribute(){},innerHTML:''};
  const host={isConnected:true,innerHTML:'',addEventListener:(n,fn)=>events[n]=fn,removeEventListener:n=>delete events[n],
    querySelector:s=>s==='#a3-controls'||s==='#a3-scene'||s==='#a3-source'?nodes.get(s)||nodes.set(s,{innerHTML:''}).get(s):null,
    querySelectorAll:s=>s==='[data-a3-play]'?[play]:[]};
  const document={hidden:false,body:{hasAttribute:()=>false,classList:{add(){},remove(){}}},addEventListener:(n,fn)=>docEvents[n]=fn};
  const context={window:{A3Core:C,A3_DATA:D,matchMedia:()=>media},document,localStorage:{getItem:k=>{if(unavailableStorage)throw Error('blocked');return stored.get(k)||null;},setItem:(k,v)=>{if(unavailableStorage)throw Error('blocked');stored.set(k,v);}},
    setInterval:fn=>{timers.add(fn);return fn;},clearInterval:id=>timers.delete(id),requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,console};
  vm.runInNewContext(fs.readFileSync(path.join(root,'a3-unit.js'),'utf8'),context);
  const click=action=>events.click({target:{closest:selector=>selector==='[data-a3-action]'?{dataset:{a3Action:action}}:null}});
  return {api:context.window.A3Unit,host,media,play,events,timers,document,docEvents,click};
}
test('unit records sanitise imports and preserve only known lessons, commits and notes',()=>{
  const h=unitHarness(),raw={kind:'comp3702-a3-unit',version:1,done:['intro','bad','intro'],commits:[1,1,9,10,'2'],notes:{intro:'x'.repeat(12000),bad:'no'},language:'invalid'};
  const p=JSON.parse(JSON.stringify(h.api.importProgress(raw)));
  assert.deepEqual(p.done,['intro']);assert.deepEqual(p.commits,[1,9]);assert.equal(p.notes.intro.length,10000);assert.equal(p.notes.bad,undefined);assert.equal(p.language,'dual');
  assert.throws(()=>h.api.importProgress({version:1}));assert.equal(h.api.commits.length,9);assert.equal(h.api.lessons.length,8);
});
test('autoplay stops on route disposal, reduced motion changes and hidden pages',()=>{
  const h=unitHarness();h.api.mount(h.host,'update');h.click('play');assert.equal(h.timers.size,1);
  h.api.dispose();assert.equal(h.timers.size,0);assert.equal(Object.keys(h.events).length,0);
  h.api.mount(h.host,'update');h.click('play');h.media.matches=true;h.media.changed();assert.equal(h.timers.size,0);assert.equal(h.play.disabled,true);
  h.click('play');assert.equal(h.timers.size,0);h.click('next');assert.ok(h.host.querySelector('#a3-scene').innerHTML.includes('0.9 × 5'));
  h.media.matches=false;h.media.changed();h.click('play');assert.equal(h.timers.size,1);h.document.hidden=true;h.docEvents.visibilitychange();assert.equal(h.timers.size,0);
});
test('lessons remain readable with blocked browser storage',()=>{
  const h=unitHarness(true,true);for(const [id]of h.api.lessons){h.api.mount(h.host,id);assert.ok(h.host.querySelector('#a3-scene').innerHTML.length>100);}
  h.click('complete');assert.equal(h.api.exportProgress().done.length,1);
});
console.log(`${checks} groups passed. 244 Python vectors, 24 transitions, 15 original curves checked.`);
